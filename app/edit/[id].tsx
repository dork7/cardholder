import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput } from 'react-native';
import { useApp } from '../../src/app/AppProvider';
import { draftFor, EditDraft, planSave, SaveError } from '../../src/cards/editForm';
import { NAME_MAX_LENGTH } from '../../src/config';
import { dataUri, useCardImage } from '../../src/hooks/useCardImage';
import { pickImage } from '../../src/images/capture';
import { requestReminderPermissionOnce } from '../../src/reminders/scheduler';
import { strings } from '../../src/strings';
import { Button } from '../../src/ui/Button';
import { CategoryChips } from '../../src/ui/CategoryChips';
import { ExpiryField } from '../../src/ui/ExpiryField';
import { Field, useInputStyle } from '../../src/ui/Field';
import { ImageField } from '../../src/ui/ImageField';
import { Text } from '../../src/ui/Text';
import { useTheme } from '../../src/ui/theme';

export default function EditCard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const { services, cards, unlocked, refresh } = useApp();
  const existing = isNew ? null : (cards.find((c) => c.id === id) ?? null);
  const router = useRouter();
  const theme = useTheme();
  const inputStyle = useInputStyle();

  const [draft, setDraft] = useState<EditDraft>(() => draftFor(existing));
  const [errors, setErrors] = useState<SaveError[]>([]);
  const [saving, setSaving] = useState(false);
  const existingFront = useCardImage(existing ?? undefined, 'front');
  const existingBack = useCardImage(existing?.hasBack ? existing : undefined, 'back');

  const update = (patch: Partial<EditDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const errorText = (e: SaveError) => (errors.includes(e) ? strings.edit.errors[e] : undefined);

  if (!isNew && !existing) {
    return (
      <Text style={[styles.content, { color: theme.text, fontSize: 18 }]}>{strings.edit.notFound}</Text>
    );
  }

  const capture = async (side: 'front' | 'back') => {
    try {
      const captured = await pickImage();
      if (!captured) return;
      if (side === 'front') update({ front: captured });
      else update({ back: captured, removeBack: false });
    } catch (e) {
      console.warn('Capture failed', e);
      Alert.alert(strings.edit.captureFailed);
    }
  };

  const save = async () => {
    const plan = planSave(draft, { existing, cardCount: cards.length, unlocked });
    if (plan.kind === 'invalid') {
      setErrors(plan.errors);
      return;
    }
    if (plan.kind === 'limit-reached') {
      router.replace('/paywall');
      return;
    }
    setSaving(true);
    try {
      if (plan.kind === 'create') await services.store.create(plan.fields, plan.images);
      else await services.store.update(plan.id, plan.fields, plan.changes);
      if (plan.fields.expiresOn) await requestReminderPermissionOnce();
      await refresh();
      router.back();
    } catch (e) {
      console.warn('Save failed', e);
      setSaving(false);
      Alert.alert(strings.common.error);
    }
  };

  const confirmDelete = () =>
    Alert.alert(strings.edit.deleteConfirmTitle, strings.edit.deleteConfirmBody, [
      { text: strings.common.cancel, style: 'cancel' },
      {
        text: strings.common.delete,
        style: 'destructive',
        onPress: async () => {
          if (!existing) return;
          await services.store.remove(existing.id);
          await refresh();
          router.dismissAll();
        },
      },
    ]);

  const frontUri = draft.front ? dataUri(draft.front.jpegBase64) : existingFront;
  const backUri = draft.back ? dataUri(draft.back.jpegBase64) : draft.removeBack ? null : existingBack;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: isNew ? strings.edit.newTitle : strings.edit.editTitle }} />
      <ScrollView
        style={{ backgroundColor: theme.bg }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <ImageField
          label={strings.edit.front}
          uri={frontUri}
          onLibrary={() => capture('front')}
          error={errorText('front-required')}
          testIDPrefix="front"
        />
        <ImageField
          label={strings.edit.back}
          uri={backUri}
          onLibrary={() => capture('back')}
          onRemove={backUri ? () => update({ back: null, removeBack: true }) : undefined}
          testIDPrefix="back"
        />
        <Field label={strings.edit.name} error={errorText('name-required') ?? errorText('name-too-long')}>
          <TextInput
            testID="card-name"
            value={draft.name}
            onChangeText={(name) => update({ name })}
            placeholder={strings.edit.namePlaceholder}
            placeholderTextColor={theme.muted}
            maxLength={NAME_MAX_LENGTH}
            accessibilityLabel={strings.edit.name}
            style={inputStyle}
          />
        </Field>
        <Field label={strings.edit.category} error={errorText('bad-category')}>
          <CategoryChips value={draft.category} onChange={(category) => category && update({ category })} />
        </Field>
        <Field label={strings.edit.number}>
          <TextInput
            value={draft.number}
            onChangeText={(number) => update({ number })}
            autoCorrect={false}
            autoCapitalize="characters"
            accessibilityLabel={strings.edit.number}
            style={[inputStyle, { fontVariant: ['tabular-nums'] }]}
          />
        </Field>
        <Field label={strings.edit.notes}>
          <TextInput
            value={draft.notes}
            onChangeText={(notes) => update({ notes })}
            multiline
            accessibilityLabel={strings.edit.notes}
            style={[inputStyle, { minHeight: 96, textAlignVertical: 'top' }]}
          />
        </Field>
        <ExpiryField value={draft.expiresOn} onChange={(expiresOn) => update({ expiresOn })} />
        {errorText('bad-expiry') && <Text style={{ color: theme.danger, fontSize: 16 }}>{errorText('bad-expiry')}</Text>}
        <Button label={strings.common.save} onPress={save} disabled={saving} testID="save-card" />
        {existing && <Button variant="danger" label={strings.edit.deleteCard} onPress={confirmDelete} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 20, paddingBottom: 48 },
});

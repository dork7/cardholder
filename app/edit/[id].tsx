import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { GlassPanel, GlassScene } from '../../src/ui/Glass';
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
  const insets = useSafeAreaInsets();

  const [draft, setDraft] = useState<EditDraft>(() => draftFor(existing));
  const [errors, setErrors] = useState<SaveError[]>([]);
  const [saving, setSaving] = useState(false);
  const writing = useRef(false); // synchronous guard: state updates land a render too late for a fast double tap
  const existingFront = useCardImage(existing ?? undefined, 'front');
  const existingBack = useCardImage(existing?.hasBack ? existing : undefined, 'back');

  const update = (patch: Partial<EditDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const errorText = (e: SaveError) => (errors.includes(e) ? strings.edit.errors[e] : undefined);

  if (!isNew && !existing) {
    return (
      <GlassScene style={styles.content}>
        <GlassPanel style={styles.group}>
          <Text style={{ color: theme.text, fontSize: 18 }}>{strings.edit.notFound}</Text>
        </GlassPanel>
      </GlassScene>
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
    if (writing.current) return;
    const plan = planSave(draft, { existing, cardCount: cards.length, unlocked });
    if (plan.kind === 'invalid') {
      setErrors(plan.errors);
      return;
    }
    if (plan.kind === 'limit-reached') {
      router.replace('/paywall');
      return;
    }
    writing.current = true;
    setSaving(true);
    // The store write is the only step that can fail the save. Once it has succeeded the card exists,
    // so `saving` stays true (Save can't write it again) and the follow-ups below are best-effort.
    try {
      if (plan.kind === 'create') await services.store.create(plan.fields, plan.images);
      else await services.store.update(plan.id, plan.fields, plan.changes);
    } catch (e) {
      console.warn('Save failed', e);
      writing.current = false;
      setSaving(false);
      Alert.alert(strings.common.error);
      return;
    }
    if (plan.fields.expiresOn) {
      await requestReminderPermissionOnce().catch((e) => console.warn('Reminder permission request failed', e));
    }
    await refresh().catch((e) => console.warn('Refresh after save failed', e));
    router.back();
  };

  const confirmDelete = () =>
    Alert.alert(strings.edit.deleteConfirmTitle, strings.edit.deleteConfirmBody, [
      { text: strings.common.cancel, style: 'cancel' },
      {
        text: strings.common.delete,
        style: 'destructive',
        onPress: async () => {
          if (!existing) return;
          try {
            await services.store.remove(existing.id);
          } catch (e) {
            console.warn('Delete failed', e);
            Alert.alert(strings.common.error);
            return;
          }
          await refresh().catch((e) => console.warn('Refresh after delete failed', e));
          router.dismissAll();
        },
      },
    ]);

  const frontUri = draft.front ? dataUri(draft.front.jpegBase64) : existingFront;
  const backUri = draft.back ? dataUri(draft.back.jpegBase64) : draft.removeBack ? null : existingBack;

  return (
    <GlassScene>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Stack.Screen options={{ title: isNew ? strings.edit.newTitle : strings.edit.editTitle }} />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Three panels, not one per field: each panel is a live blur, so fewer is smoother. */}
          <GlassPanel style={styles.group}>
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
          </GlassPanel>
          <GlassPanel style={styles.group}>
            <Field label={strings.edit.name} error={errorText('name-too-long')}>
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
          </GlassPanel>
          <GlassPanel style={styles.group}>
            <ExpiryField value={draft.expiresOn} onChange={(expiresOn) => update({ expiresOn })} />
            {errorText('bad-expiry') && (
              <Text style={{ color: theme.danger, fontSize: 16 }}>{errorText('bad-expiry')}</Text>
            )}
          </GlassPanel>
          {/* Destructive, so it sits at the very end of the form, well apart from the save bar. */}
          {existing && (
            <View style={styles.danger}>
              <Button variant="danger" label={strings.edit.deleteCard} onPress={confirmDelete} />
            </View>
          )}
        </ScrollView>
        {/* Pinned below the scroll so both actions are always in thumb reach and ride above the keyboard;
            Close on the left, the primary action last on the right. */}
        <View style={[styles.inset, { paddingBottom: 8 + insets.bottom }]}>
          <GlassPanel style={styles.bar} radius={28}>
            <View style={styles.action}>
              <Button variant="secondary" label={strings.common.close} onPress={() => router.back()} testID="close-edit" />
            </View>
            <View style={styles.action}>
              <Button
                label={isNew ? strings.edit.create : strings.edit.saveChanges}
                onPress={save}
                disabled={saving}
                testID="save-card"
              />
            </View>
          </GlassPanel>
        </View>
      </KeyboardAvoidingView>
    </GlassScene>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  group: { padding: 16, gap: 20 },
  danger: { marginTop: 28 },
  inset: { paddingHorizontal: 16, paddingTop: 8 },
  bar: { flexDirection: 'row', gap: 12, padding: 8 },
  action: { flex: 1 },
});

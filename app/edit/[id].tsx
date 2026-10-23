import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/app/AppProvider';
import { analyzeImage } from '../../src/analysis/analyze';
import {
  acceptFolderOffer,
  applyAnalysis,
  applyFolderSuggestion,
  editField,
  EditDraft,
  formFor,
  planSave,
  SaveError,
} from '../../src/cards/editForm';
import { NAME_MAX_LENGTH } from '../../src/config';
import { findFolderNamed } from '../../src/folders/names';
import { suggestFolder } from '../../src/folders/suggest';
import { dataUri, useCardImage } from '../../src/hooks/useCardImage';
import { pickImage } from '../../src/images/capture';
import { requestReminderPermissionOnce } from '../../src/reminders/scheduler';
import { strings } from '../../src/strings';
import { Button } from '../../src/ui/Button';
import { CategoryChips } from '../../src/ui/CategoryChips';
import { Chip, ChipRow } from '../../src/ui/ChipRow';
import { ExpiryField } from '../../src/ui/ExpiryField';
import { Field, useInputStyle } from '../../src/ui/Field';
import { FolderNameInput } from '../../src/ui/FolderNameInput';
import { ImageField } from '../../src/ui/ImageField';
import { Panel, Screen } from '../../src/ui/Surface';
import { Text } from '../../src/ui/Text';
import { useTheme } from '../../src/ui/theme';

export default function EditCard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const { services, cards, folders, unlocked, refresh } = useApp();
  const existing = isNew ? null : (cards.find((c) => c.id === id) ?? null);
  const router = useRouter();
  const theme = useTheme();
  const inputStyle = useInputStyle();
  const insets = useSafeAreaInsets();

  const [form, setForm] = useState(() => formFor(existing));
  const draft = form.draft;
  // How many photos are being read right now, and which read is current for each side: a result for a
  // photo that has since been replaced or removed is dropped.
  const [reading, setReading] = useState(0);
  const reads = useRef({ front: 0, back: 0 });
  const [errors, setErrors] = useState<SaveError[]>([]);
  const [saving, setSaving] = useState(false);
  const [namingFolder, setNamingFolder] = useState(false);
  const writing = useRef(false); // synchronous guard: state updates land a render too late for a fast double tap
  const existingFront = useCardImage(existing ?? undefined, 'front');
  const existingBack = useCardImage(existing?.hasBack ? existing : undefined, 'back');

  const update = (patch: Partial<EditDraft>) => setForm((f) => editField(f, patch));
  const suggestedHint = (field: keyof typeof form.suggested) =>
    form.suggested[field] !== undefined ? strings.edit.suggested : undefined;
  const errorText = (e: SaveError) => (errors.includes(e) ? strings.edit.errors[e] : undefined);

  if (!isNew && !existing) {
    return (
      <Screen style={styles.content}>
        <Panel style={styles.group}>
          <Text style={{ color: theme.text, fontSize: 18 }}>{strings.edit.notFound}</Text>
        </Panel>
      </Screen>
    );
  }

  const capture = async (side: 'front' | 'back') => {
    try {
      const captured = await pickImage();
      if (!captured) return;
      if (side === 'front') update({ front: captured });
      else update({ back: captured, removeBack: false });
      readCard(side, captured.jpegBase64);
    } catch (e) {
      console.warn('Capture failed', e);
      Alert.alert(strings.edit.captureFailed);
    }
  };

  // Reads the photo on the device and pre-fills what it finds. Never blocks the form: the user can
  // keep typing, and anything they set is left alone.
  const readCard = (side: 'front' | 'back', jpegBase64: string) => {
    const read = ++reads.current[side];
    setReading((n) => n + 1);
    analyzeImage(jpegBase64)
      .then((analysis) => {
        if (reads.current[side] !== read) return;
        setForm((f) => applyFolderSuggestion(applyAnalysis(f, analysis), suggestFolder(analysis, folders)));
      })
      .catch((e) => console.warn('Reading the card failed', e))
      .finally(() => setReading((n) => n - 1));
  };

  const removeBack = () => {
    reads.current.back++; // drop a read of the photo being removed
    update({ back: null, removeBack: true });
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
      let fields = plan.fields;
      if (plan.newFolder) {
        // Reuse a folder of that name, e.g. one made by an earlier attempt whose card write then failed.
        const folder =
          findFolderNamed(await services.store.listFolders(), plan.newFolder) ??
          (await services.store.createFolder(plan.newFolder));
        fields = { ...fields, folderId: folder.id };
      }
      if (plan.kind === 'create') await services.store.create(fields, plan.images);
      else await services.store.update(plan.id, fields, plan.changes);
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

  const folderChips: Chip[] = [
    {
      key: 'none',
      label: strings.folders.none,
      selected: draft.folderId === null && draft.newFolderName === null,
      onPress: () => update({ folderId: null, newFolderName: null }),
      testID: 'folder-none',
    },
    ...folders.map((f) => ({
      key: f.id,
      label: f.name,
      selected: draft.folderId === f.id,
      onPress: () => update({ folderId: f.id, newFolderName: null }),
      testID: `folder-${f.id}`,
    })),
    ...(draft.newFolderName
      ? [{ key: 'pending', label: strings.folders.pendingNew(draft.newFolderName), selected: true, onPress: () => {} }]
      : []),
    { key: 'add', label: `+ ${strings.folders.newFolder}`, onPress: () => setNamingFolder(true), testID: 'folder-add' },
  ];

  const frontUri = draft.front ? dataUri(draft.front.jpegBase64) : existingFront;
  const backUri = draft.back ? dataUri(draft.back.jpegBase64) : draft.removeBack ? null : existingBack;

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Stack.Screen options={{ title: isNew ? strings.edit.newTitle : strings.edit.editTitle }} />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Three panels, not one per field: photos, details, expiry. */}
          <Panel style={styles.group}>
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
              onRemove={backUri ? removeBack : undefined}
              testIDPrefix="back"
            />
            {reading > 0 && (
              <Text style={{ color: theme.muted, fontSize: 16 }} accessibilityLiveRegion="polite" testID="reading-card">
                {strings.edit.reading}
              </Text>
            )}
          </Panel>
          <Panel style={styles.group}>
            <Field label={strings.edit.name} error={errorText('name-too-long')} hint={suggestedHint('name')}>
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
            <Field label={strings.edit.category} error={errorText('bad-category')} hint={suggestedHint('category')}>
              <CategoryChips value={draft.category} onChange={(category) => category && update({ category })} />
            </Field>
            <Field label={strings.folders.folder} hint={form.folderSuggested ? strings.edit.suggested : undefined}>
              {form.folderOffer && !namingFolder && (
                <View style={[styles.offer, { backgroundColor: theme.bannerBg }]} testID="folder-offer">
                  <Text style={{ color: theme.text, fontSize: 16, fontWeight: '700' }}>
                    {strings.folders.suggestNewTitle}
                  </Text>
                  <Text style={{ color: theme.muted, fontSize: 16 }}>
                    {strings.folders.suggestNewBody(form.folderOffer)}
                  </Text>
                  <Button
                    variant="secondary"
                    label={strings.folders.suggestNewAction(form.folderOffer)}
                    onPress={() => setForm(acceptFolderOffer)}
                    testID="accept-folder-offer"
                  />
                </View>
              )}
              {namingFolder ? (
                <FolderNameInput
                  folders={folders}
                  submitLabel={strings.folders.create}
                  onSubmit={(name) => {
                    // Made on save, with the card: backing out of the form leaves no empty folder behind.
                    update({ folderId: null, newFolderName: name });
                    setNamingFolder(false);
                  }}
                  onCancel={() => setNamingFolder(false)}
                  testIDPrefix="new-folder"
                />
              ) : (
                <ChipRow chips={folderChips} accessibilityLabel={strings.folders.folder} />
              )}
            </Field>
          </Panel>
          <Panel style={styles.group}>
            <ExpiryField
              value={draft.expiresOn}
              onChange={(expiresOn) => update({ expiresOn })}
              hint={suggestedHint('expiresOn')}
            />
            {errorText('bad-expiry') && (
              <Text style={{ color: theme.danger, fontSize: 16 }}>{errorText('bad-expiry')}</Text>
            )}
          </Panel>
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
          <Panel style={styles.bar} radius={28}>
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
          </Panel>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  group: { padding: 16, gap: 20 },
  danger: { marginTop: 28 },
  offer: { gap: 8, padding: 16, borderRadius: 16 },
  inset: { paddingHorizontal: 16, paddingTop: 8 },
  bar: { flexDirection: 'row', gap: 12, padding: 8 },
  action: { flex: 1 },
});

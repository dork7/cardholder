import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/app/AppProvider';
import { analyzeImage } from '../../src/analysis/analyze';
import { gemmaReader, releaseGemma } from '../../src/analysis/gemma';
import { displayName } from '../../src/cards/display';
import { findDuplicate } from '../../src/cards/duplicates';
import {
  acceptFolderOffer,
  applyAnalysis,
  applyFolderSuggestion,
  editField,
  EditDraft,
  formFor,
  planSave,
  SaveError,
  SavePlan,
} from '../../src/cards/editForm';
import { FOLDERS_ENABLED, NAME_MAX_LENGTH, PDF_MAX_BYTES } from '../../src/config';
import { findFolderNamed } from '../../src/folders/names';
import { suggestFolder } from '../../src/folders/suggest';
import { dataUri, useCardImage } from '../../src/hooks/useCardImage';
import { useCardPdf } from '../../src/hooks/usePdf';
import { pickImage } from '../../src/images/capture';
import { canPickPdf, isPdfLocked, PdfTooLargeError, pickPdf, renderCover } from '../../src/images/pdf';
import { requestReminderPermissionOnce } from '../../src/reminders/scheduler';
import { askReplace } from '../../src/ui/askReplace';
import { strings } from '../../src/strings';
import { Button } from '../../src/ui/Button';
import { CategoryChips } from '../../src/ui/CategoryChips';
import { CategoryNameInput } from '../../src/ui/CategoryNameInput';
import { Chip, ChipRow } from '../../src/ui/ChipRow';
import { ExpiryField } from '../../src/ui/ExpiryField';
import { Field, useInputStyle } from '../../src/ui/Field';
import { FolderNameInput } from '../../src/ui/FolderNameInput';
import { ImageField } from '../../src/ui/ImageField';
import { PdfPagePicker } from '../../src/ui/PdfPagePicker';
import { Panel, Screen } from '../../src/ui/Surface';
import { Text } from '../../src/ui/Text';
import { useTheme } from '../../src/ui/theme';

export default function EditCard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const { services, cards, folders, categories, unlocked, refresh } = useApp();
  const existing = isNew ? null : (cards.find((c) => c.id === id) ?? null);
  const router = useRouter();
  const theme = useTheme();
  const inputStyle = useInputStyle();
  const insets = useSafeAreaInsets();

  const [form, setForm] = useState(() => formFor(existing, categories[0]));
  const draft = form.draft;
  // How many photos are being read right now, and which read is current for each side: a result for a
  // photo that has since been replaced or removed is dropped.
  const [reading, setReading] = useState(0);
  const reads = useRef({ front: 0, back: 0 });
  const covers = useRef(0); // which cover render is current: a slower, earlier tap is dropped
  // The AI model, if the user has downloaded it, takes ~300 MB while loaded: free it when the form closes.
  useEffect(() => () => void releaseGemma().catch(() => {}), []);
  const [errors, setErrors] = useState<SaveError[]>([]);
  const [saving, setSaving] = useState(false);
  const [namingFolder, setNamingFolder] = useState(false);
  const [namingCategory, setNamingCategory] = useState(false);
  const writing = useRef(false); // synchronous guard: state updates land a render too late for a fast double tap
  const existingFront = useCardImage(existing ?? undefined, 'front');
  const existingBack = useCardImage(existing?.hasBack ? existing : undefined, 'back');
  const existingPdf = useCardPdf(existing?.pdf && !draft.removePdf ? existing : undefined);

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
      // A photo of the front replaces a PDF: the card becomes a photo card again.
      if (side === 'front') update({ front: captured, pdf: null, removePdf: !!existing?.pdf });
      else update({ back: captured, removeBack: false });
      covers.current++;
      readCard(side, captured.jpegBase64);
    } catch (e) {
      console.warn('Capture failed', e);
      Alert.alert(strings.edit.captureFailed);
    }
  };

  // The whole PDF is kept. Its first page is the card's picture until another is chosen, and its
  // pages take the place of a back photo.
  const attachPdf = async () => {
    try {
      const pdf = await pickPdf();
      if (!pdf) return;
      const cover = ++covers.current;
      const front = await renderCover(pdf);
      if (covers.current !== cover) return;
      reads.current.back++; // drop a read of the back photo being removed
      update({ pdf, front, back: null, removeBack: !!existing?.hasBack, removePdf: false });
      readCard('front', front.jpegBase64);
    } catch (e) {
      console.warn('PDF failed', e);
      if (e instanceof PdfTooLargeError) Alert.alert(strings.edit.pdfTooLarge(PDF_MAX_BYTES / 1024 / 1024));
      else Alert.alert(isPdfLocked(e) ? strings.edit.pdfLocked : strings.edit.pdfFailed);
    }
  };

  const chooseCoverPage = async (page: number) => {
    const pdf = currentPdf();
    if (!pdf || page === pdf.coverPage) return;
    const next = { ...pdf, coverPage: page };
    const cover = ++covers.current;
    try {
      const front = await renderCover(next);
      if (covers.current !== cover) return;
      update({ pdf: next, front });
      readCard('front', front.jpegBase64);
    } catch (e) {
      console.warn('Rendering the cover page failed', e);
      Alert.alert(strings.edit.pdfFailed);
    }
  };

  // Reads the photo on the device and pre-fills what it finds. Never blocks the form: the user can
  // keep typing, and anything they set is left alone.
  const readCard = (side: 'front' | 'back', jpegBase64: string) => {
    const read = ++reads.current[side];
    setReading((n) => n + 1);
    analyzeImage(jpegBase64, { smart: gemmaReader })
      .then((analysis) => {
        if (reads.current[side] !== read) return;
        // A category the user has deleted isn't suggested back.
        if (analysis.category && !categories.includes(analysis.category.value)) analysis = { ...analysis, category: undefined };
        setForm((f) => {
          const read = applyAnalysis(f, analysis);
          return FOLDERS_ENABLED ? applyFolderSuggestion(read, suggestFolder(analysis, folders)) : read;
        });
      })
      .catch((e) => console.warn('Reading the card failed', e))
      .finally(() => setReading((n) => n - 1));
  };

  // The PDF on screen: one just picked, else the saved one once it has loaded.
  const currentPdf = () =>
    draft.pdf ?? (existing?.pdf && existingPdf && !draft.removePdf ? { ...existing.pdf, pdfBase64: existingPdf } : null);
  const pdfInfo = draft.pdf ?? (draft.removePdf ? null : (existing?.pdf ?? null));

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
    // A new card that looks like one already saved: offer to replace the old one instead.
    const duplicate = plan.kind === 'create' ? findDuplicate(plan.fields, cards) : null;
    if (duplicate && plan.kind === 'create') {
      const choice = await askReplace(displayName(duplicate));
      if (choice === 'cancel') {
        writing.current = false;
        return;
      }
      if (choice === 'replace') {
        // The new photos take over the old card; a back the new card doesn't have is removed. The card
        // stays in its folder unless a folder was chosen for the new one.
        const folderId = plan.fields.folderId ?? (plan.newFolder ? null : duplicate.folderId);
        await write({
          kind: 'update',
          id: duplicate.id,
          fields: { ...plan.fields, folderId },
          // A photo card taking over a PDF card drops the PDF.
          changes: { ...plan.images, pdf: plan.images.pdf ?? null },
          newFolder: plan.newFolder,
        });
        return;
      }
    }
    await write(plan);
  };

  const write = async (plan: Extract<SavePlan, { kind: 'create' | 'update' }>) => {
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
      await services.store.addCategory(fields.category);
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
              label={pdfInfo ? strings.edit.pdfFront : strings.edit.front}
              uri={frontUri}
              onLibrary={() => capture('front')}
              onPdf={canPickPdf ? attachPdf : undefined}
              pdfLabel={pdfInfo ? strings.edit.replacePdf : undefined}
              error={errorText('front-required')}
              testIDPrefix="front"
            />
            {pdfInfo ? (
              <PdfPagePicker
                pdfBase64={draft.pdf?.pdfBase64 ?? existingPdf}
                pageCount={pdfInfo.pageCount}
                coverPage={pdfInfo.coverPage}
                onChange={chooseCoverPage}
              />
            ) : (
              // The back waits for the front: a card starts from its front photo.
              (frontUri || backUri) && (
                <ImageField
                  label={strings.edit.back}
                  uri={backUri}
                  onLibrary={() => capture('back')}
                  onRemove={backUri ? removeBack : undefined}
                  testIDPrefix="back"
                />
              )
            )}
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
              {namingCategory ? (
                <CategoryNameInput
                  categories={categories}
                  onSubmit={(category) => {
                    // Saved to the list with the card, so backing out leaves no unused category behind.
                    update({ category });
                    setNamingCategory(false);
                  }}
                  onCancel={() => setNamingCategory(false)}
                />
              ) : (
                <CategoryChips
                  value={draft.category}
                  onChange={(category) => category && update({ category })}
                  categories={categories.includes(draft.category) ? categories : [...categories, draft.category]}
                  onAddNew={() => setNamingCategory(true)}
                />
              )}
            </Field>
            {FOLDERS_ENABLED && (
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
            )}
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

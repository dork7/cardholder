import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ComponentRef, useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EASE_OUT } from '../../src/ui/motion';
import { useApp } from '../../src/app/AppProvider';
import { analyzeImage } from '../../src/analysis/analyze';
import { displayName } from '../../src/cards/display';
import { FrontImage, looksVertical } from '../../src/cards/types';
import { findDuplicate } from '../../src/cards/duplicates';
import { allTags, hasTag, normalizeTags, sameTag, tagOptions } from '../../src/cards/tags';
import { suggestedTag } from '../../src/analysis/documentType';
import {
  acceptFolderOffer,
  applyAnalysis,
  applyReadText,
  removeReadSide,
  applyFolderSuggestion,
  editField,
  EditDraft,
  firstErrorPanel,
  formFor,
  FormPanel,
  hasChanges,
  planSave,
  SaveError,
  SavePlan,
} from '../../src/cards/editForm';
import { DEFAULT_REMIND_DAYS, FOLDERS_ENABLED, NAME_MAX_LENGTH, PDF_MAX_BYTES } from '../../src/config';
import { parseRemindDays } from '../../src/cards/validate';
import { findFolderNamed } from '../../src/folders/names';
import { suggestFolder } from '../../src/folders/suggest';
import { dataUri, useCardImage } from '../../src/hooks/useCardImage';
import { useCardPdf } from '../../src/hooks/usePdf';
import { clearOriginals, cropFullPhoto, discardFile, pickImage } from '../../src/images/capture';
import { canPickPdf, isPdfLocked, PDF_BACK_PAGE, PdfTooLargeError, pickPdf, renderCover, renderPdfPage } from '../../src/images/pdf';
import { requestReminderPermissionOnce } from '../../src/reminders/scheduler';
import { askReplace } from '../../src/ui/askReplace';
import { strings } from '../../src/strings';
import { Button } from '../../src/ui/Button';
import { TagChips } from '../../src/ui/TagChips';
import { TagNameInput } from '../../src/ui/TagNameInput';
import { Chip, ChipRow } from '../../src/ui/ChipRow';
import { ExpiryField } from '../../src/ui/ExpiryField';
import { Field, useInputStyle } from '../../src/ui/Field';
import { FolderNameInput } from '../../src/ui/FolderNameInput';
import { ImageField } from '../../src/ui/ImageField';
import { PdfPagePicker } from '../../src/ui/PdfPagePicker';
import { Panel, Screen } from '../../src/ui/Surface';
import { Text } from '../../src/ui/Text';
import { useTheme } from '../../src/ui/theme';
import { useConfirmDiscard } from '../../src/ui/useConfirmDiscard';
import { LiveText } from '../../src/ui/LiveText';

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
  // Every tag in use and the starters, then any typed here that no saved card has yet.
  const offeredTags = normalizeTags([...tagOptions(cards), ...draft.tags]);
  // How many photos are being read right now, and which read is current for each side: a result for a
  // photo that has since been replaced or removed is dropped.
  const [reading, setReading] = useState(0);
  const reads = useRef({ front: 0, back: 0 });
  const covers = useRef(0); // which cover render is current: a slower, earlier tap is dropped
  // The whole photo behind a side that was cut around the card automatically, for "Use full photo".
  // Plaintext, so each is deleted once it can't be used, and all of them when the form closes; any
  // left over from a crash go when the form opens.
  const [originals, setOriginals] = useState<{ front: string | null; back: string | null }>({ front: null, back: null });
  const keptOriginals = useRef(originals);
  const setOriginal = (side: 'front' | 'back', path: string | null) => {
    const previous = keptOriginals.current[side];
    if (previous && previous !== path) discardFile(previous);
    keptOriginals.current = { ...keptOriginals.current, [side]: path };
    setOriginals(keptOriginals.current);
  };
  useEffect(() => {
    clearOriginals();
    return clearOriginals;
  }, []);
  const [errors, setErrors] = useState<SaveError[]>([]);
  const [saving, setSaving] = useState(false);
  const [namingFolder, setNamingFolder] = useState(false);
  const [namingTag, setNamingTag] = useState(false);
  const writing = useRef(false); // synchronous guard: state updates land a render too late for a fast double tap
  const existingFront = useCardImage(existing ?? undefined, 'front');
  const existingBack = useCardImage(existing?.hasBack ? existing : undefined, 'back');
  const existingPdf = useCardPdf(existing?.pdf && !draft.removePdf ? existing : undefined);

  const update = (patch: Partial<EditDraft>) => setForm((f) => editField(f, patch));
  const suggestedHint = (field: keyof typeof form.suggested) =>
    form.suggested[field] !== undefined ? strings.edit.suggested : undefined;
  const errorText = (e: SaveError) => (errors.includes(e) ? strings.edit.errors[e] : undefined);
  // Closing with unsaved changes asks first; saving or deleting leaves without asking.
  const initialDraft = useRef(draft).current;
  const leave = useConfirmDiscard(hasChanges(initialDraft, draft));
  // Where each panel sits in the scroll, so a Save that fails can bring its first error into view.
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const panelY = useRef<Partial<Record<FormPanel, number>>>({});
  const reduceMotion = useReducedMotion();
  const onPanelLayout = (panel: FormPanel) => (e: { nativeEvent: { layout: { y: number } } }) => {
    panelY.current[panel] = e.nativeEvent.layout.y;
  };
  const showFirstError = (found: SaveError[]) => {
    const first = firstErrorPanel(found);
    const y = first && panelY.current[first];
    if (y !== undefined) scroll.current?.scrollTo({ y: Math.max(0, y - 16), animated: !reduceMotion });
  };

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
      const picked = await pickImage();
      if (!picked) return;
      applyImage(side, picked.image);
      setOriginal(side, picked.original);
    } catch (e) {
      console.warn('Capture failed', e);
      Alert.alert(strings.edit.captureFailed);
    }
  };

  const applyImage = (side: 'front' | 'back', image: FrontImage) => {
    // A photo of the front replaces a PDF: the card becomes a photo card again, and the back, a page of
    // that PDF, goes with it.
    if (side === 'front' && pdfInfo) {
      reads.current.back++;
      update({ front: image, pdf: null, removePdf: !!existing?.pdf, back: null, removeBack: !!existing?.hasBack, vertical: looksVertical(image.aspect) });
      setForm((f) => removeReadSide(f, 'back'));
    } else if (side === 'front') update({ front: image, pdf: null, removePdf: !!existing?.pdf, vertical: looksVertical(image.aspect) });
    else update({ back: image, removeBack: false });
    covers.current++;
    readCard(side, image.jpegBase64);
  };

  // Crop again from the whole photo. Once used, the photo is no longer a cut, so the option goes.
  const cropWholePhoto = async (side: 'front' | 'back') => {
    const original = keptOriginals.current[side];
    if (!original) return;
    try {
      const image = await cropFullPhoto(original);
      if (!image || keptOriginals.current[side] !== original) return;
      applyImage(side, image);
      setOriginal(side, null);
    } catch (e) {
      console.warn('Capture failed', e);
      Alert.alert(strings.edit.captureFailed);
    }
  };

  // The whole PDF is kept. Its first page is the card's picture until another is chosen, and its
  // second page, when it has one, is the card's back (the side the home stack flips to) until removed.
  const attachPdf = async () => {
    try {
      const pdf = await pickPdf();
      if (!pdf) return;
      const cover = ++covers.current;
      const front = await renderCover(pdf);
      const back = pdf.pageCount > PDF_BACK_PAGE ? await renderPdfPage(pdf, PDF_BACK_PAGE) : null;
      if (covers.current !== cover) return;
      reads.current.back++; // drop a read of the back photo being replaced
      setForm((f) => removeReadSide(f, 'back'));
      const vertical = looksVertical(front.aspect);
      if (back) update({ pdf, front, back, removeBack: false, removePdf: false, vertical });
      else update({ pdf, front, back: null, removeBack: !!existing?.hasBack, removePdf: false, vertical });
      setOriginal('front', null);
      setOriginal('back', null);
      readCard('front', front.jpegBase64);
      if (back) readCard('back', back.jpegBase64);
    } catch (e) {
      console.warn('PDF failed', e);
      if (e instanceof PdfTooLargeError) Alert.alert(strings.edit.pdfTooLarge(PDF_MAX_BYTES / 1024 / 1024));
      else Alert.alert(isPdfLocked(e) ? strings.edit.pdfLocked : strings.edit.pdfFailed);
    }
  };

  // Puts the PDF's second page back as the card's back, after it was removed (or on a PDF card saved without one).
  const restorePdfBack = async () => {
    const pdf = currentPdf();
    if (!pdf || pdf.pageCount <= PDF_BACK_PAGE) return;
    try {
      const back = await renderPdfPage(pdf, PDF_BACK_PAGE);
      reads.current.back++;
      update({ back, removeBack: false });
      readCard('back', back.jpegBase64);
    } catch (e) {
      console.warn('Rendering the back page failed', e);
      Alert.alert(strings.edit.pdfFailed);
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
      update({ pdf: next, front, vertical: looksVertical(front.aspect) });
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
    analyzeImage(jpegBase64)
      .then((analysis) => {
        if (reads.current[side] !== read) return;
        // The document's own type ("Residency") when it names one, else its broad kind ("ID").
        const suggestion = { ...analysis, tags: suggestedTag(analysis, allTags(cards)) };
        setForm((f) => {
          const read = applyReadText(applyAnalysis(f, suggestion), side, analysis.text ?? '');
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
    setForm((f) => removeReadSide(f, 'back'));
    setOriginal('back', null);
  };

  const save = async () => {
    if (writing.current) return;
    const plan = planSave(draft, { existing, cardCount: cards.length, unlocked });
    if (plan.kind === 'invalid') {
      setErrors(plan.errors);
      showFirstError(plan.errors);
      return;
    }
    if (plan.kind === 'limit-reached') {
      router.push('/paywall');
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
    leave();
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
          leave();
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

  // Set from each new front picture's shape; the user can turn it either way.
  const shapeChips: Chip[] = [
    { key: 'horizontal', label: strings.edit.horizontal, selected: !draft.vertical, onPress: () => update({ vertical: false }), testID: 'shape-horizontal' },
    { key: 'vertical', label: strings.edit.vertical, selected: draft.vertical, onPress: () => update({ vertical: true }), testID: 'shape-vertical' },
  ];

  const previewChips: Chip[] = [
    { key: 'clear', label: strings.edit.previewClear, selected: !draft.blurPreview, onPress: () => update({ blurPreview: false }), testID: 'preview-clear' },
    { key: 'blurred', label: strings.edit.previewBlurred, selected: draft.blurPreview, onPress: () => update({ blurPreview: true }), testID: 'preview-blurred' },
  ];

  const frontUri = draft.front ? dataUri(draft.front.jpegBase64) : existingFront;
  const backUri = draft.back ? dataUri(draft.back.jpegBase64) : draft.removeBack ? null : existingBack;

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Stack.Screen options={{ title: isNew ? strings.edit.newTitle : strings.edit.editTitle }} />
        <ScrollView ref={scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Three panels, not one per field: photos, details, expiry. */}
          <Panel style={styles.group} onLayout={onPanelLayout('photos')}>
            <ImageField
              label={pdfInfo ? strings.edit.pdfFront : strings.edit.front}
              uri={frontUri}
              onLibrary={() => capture('front')}
              onFullPhoto={originals.front ? () => void cropWholePhoto('front') : undefined}
              onPdf={canPickPdf ? attachPdf : undefined}
              pdfLabel={pdfInfo ? strings.edit.replacePdf : undefined}
              error={errorText('front-required')}
              vertical={draft.vertical}
              testIDPrefix="front"
            />
            {pdfInfo ? (
              <>
                <PdfPagePicker
                  pdfBase64={draft.pdf?.pdfBase64 ?? existingPdf}
                  pageCount={pdfInfo.pageCount}
                  coverPage={pdfInfo.coverPage}
                  onChange={chooseCoverPage}
                />
                {backUri ? (
                  <Animated.View key="pdf-back" entering={ENTER} exiting={EXIT}>
                    <ImageField
                      label={strings.edit.pdfBack}
                      uri={backUri}
                      onLibrary={() => capture('back')}
                      onRemove={removeBack}
                      removeAsCross
                      vertical={draft.vertical}
                      testIDPrefix="back"
                    />
                  </Animated.View>
                ) : (
                  pdfInfo.pageCount > PDF_BACK_PAGE &&
                  (draft.pdf || existingPdf) && (
                    // Waits for the picture to finish fading, so the two never overlap.
                    <Animated.View key="pdf-back-page" entering={ENTER_AFTER_EXIT}>
                      <Button
                        variant="secondary"
                        label={strings.edit.pdfBackFromPage(PDF_BACK_PAGE + 1)}
                        onPress={() => void restorePdfBack()}
                        testID="pdf-back-page"
                      />
                    </Animated.View>
                  )
                )}
              </>
            ) : (
              // The back waits for the front: a card starts from its front photo.
              (frontUri || backUri) && (
                <ImageField
                  label={strings.edit.back}
                  uri={backUri}
                  onLibrary={() => capture('back')}
                  onFullPhoto={originals.back ? () => void cropWholePhoto('back') : undefined}
                  onRemove={backUri ? removeBack : undefined}
                  vertical={draft.vertical}
                  testIDPrefix="back"
                />
              )
            )}
            {frontUri && (
              <Field label={strings.edit.shape}>
                <ChipRow chips={shapeChips} accessibilityLabel={strings.edit.shape} />
              </Field>
            )}
            <Field icon="blur" label={strings.edit.blurPreview} hint={strings.edit.blurPreviewHint}>
              <ChipRow chips={previewChips} accessibilityLabel={strings.edit.blurPreview} />
            </Field>
            {reading > 0 && (
              <LiveText style={{ color: theme.muted, fontSize: 16 }} testID="reading-card">
                {strings.edit.reading}
              </LiveText>
            )}
          </Panel>
          <Panel style={styles.group} onLayout={onPanelLayout('details')}>
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
            <Field label={strings.edit.tags} error={errorText('bad-tags')} hint={suggestedHint('tags')}>
              {namingTag ? (
                <TagNameInput
                  tags={offeredTags}
                  onSubmit={(tag) => {
                    if (!hasTag(draft, tag)) update({ tags: [...draft.tags, tag] });
                    setNamingTag(false);
                  }}
                  onCancel={() => setNamingTag(false)}
                />
              ) : (
                <TagChips
                  tags={offeredTags}
                  selected={draft.tags}
                  onPress={(tag) => tag && update({ tags: hasTag(draft, tag) ? draft.tags.filter((t) => !sameTag(t, tag)) : [...draft.tags, tag] })}
                  onAddNew={() => setNamingTag(true)}
                  multiple
                  wrap
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
          <Panel style={styles.group} onLayout={onPanelLayout('expiry')}>
            <ExpiryField
              value={draft.expiresOn}
              onChange={(expiresOn) => update({ expiresOn })}
              hint={suggestedHint('expiresOn')}
            />
            {errorText('bad-expiry') && (
              <LiveText style={{ color: theme.danger, fontSize: 16 }}>{strings.edit.errors['bad-expiry']}</LiveText>
            )}
            {draft.expiresOn !== null && (
              <Animated.View entering={ENTER} exiting={EXIT}>
                <Field label={strings.edit.remindDays} error={errorText('bad-reminder')}>
                  <TextInput
                    testID="remind-days"
                    value={draft.remindDaysBefore}
                    onChangeText={(text) => update({ remindDaysBefore: text.replace(/[^0-9]/g, '') })}
                    keyboardType="number-pad"
                    maxLength={3}
                    placeholder={String(DEFAULT_REMIND_DAYS)}
                    placeholderTextColor={theme.muted}
                    accessibilityLabel={strings.edit.remindDays}
                    style={inputStyle}
                  />
                  <Text style={{ color: theme.muted, fontSize: 14 }}>
                    {strings.edit.remindDaysHint(parseRemindDays(draft.remindDaysBefore) ?? DEFAULT_REMIND_DAYS)}
                  </Text>
                </Field>
              </Animated.View>
            )}
          </Panel>
          {/* Destructive, so it sits at the very end of the form, well apart from the save bar. */}
          {existing && (
            // Glides, rather than jumps, when a field above it appears or goes.
            <Animated.View layout={MOVE} style={styles.danger}>
              <Button variant="danger" label={strings.edit.deleteCard} onPress={confirmDelete} />
            </Animated.View>
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

// Fields that come and go fade rather than pop. Layout animations skip themselves under reduced motion.
const ENTER = FadeIn.duration(200).easing(EASE_OUT);
const EXIT = FadeOut.duration(150).easing(EASE_OUT);
const ENTER_AFTER_EXIT = FadeIn.delay(150).duration(200).easing(EASE_OUT);
const MOVE = LinearTransition.duration(200).easing(EASE_OUT);

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  group: { padding: 16, gap: 20 },
  danger: { marginTop: 28 },
  offer: { gap: 8, padding: 16, borderRadius: 16 },
  inset: { paddingHorizontal: 16, paddingTop: 8 },
  bar: { flexDirection: 'row', gap: 12, padding: 8 },
  action: { flex: 1 },
});

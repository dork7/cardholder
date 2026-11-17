import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Alert, BackHandler, Modal, Platform, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/app/AppProvider';
import { useAllowLandscape } from '../../src/hooks/useAllowLandscape';
import { useMaxBrightness } from '../../src/hooks/useMaxBrightness';
import { ZoomableImage } from '../../src/ui/ZoomableImage';
import { Button } from '../../src/ui/Button';
import { IconButton } from '../../src/ui/IconButton';
import { ActionSheet } from '../../src/ui/ActionSheet';
import { Panel, Screen } from '../../src/ui/Surface';
import { Text } from '../../src/ui/Text';
import { TRACKING, TYPE, useTheme } from '../../src/ui/theme';
import { useCardImage } from '../../src/hooks/useCardImage';
import { useCardPdf } from '../../src/hooks/usePdf';
import { PdfPager } from '../../src/ui/PdfPager';
import { displayName } from '../../src/cards/display';
import { deleteWithUndo } from '../../src/cards/deleteWithUndo';
import { expiryLabel, expiryStatus, needsExpiryAlert } from '../../src/cards/expiry';
import { ExpiryAlert } from '../../src/ui/ExpiryAlert';
import { exportCardPdf, shareCard, shareCardMarkdown } from '../../src/share/shareCard';
import { useConfirmIdShare } from '../../src/share/useConfirmIdShare';
import { cardMarkdown } from '../../src/cards/cardMarkdown';
import { addTags, overTagLimit } from '../../src/cards/batch';
import { removeTagWithUndo } from '../../src/cards/removeTagWithUndo';
import { hasTag, isId, tagOptions } from '../../src/cards/tags';
import { MAX_TAGS } from '../../src/config';
import { AddTagPill, TagPill } from '../../src/ui/TagPill';
import { TagSheet } from '../../src/ui/TagSheet';
import { canReadText, readPhotoText } from '../../src/analysis/readPhoto';
import { rereadCard } from '../../src/cards/readBackfill';
import { ChipRow } from '../../src/ui/ChipRow';
import { EASE_OUT } from '../../src/ui/motion';
import { strings } from '../../src/strings';
import { showError } from '../../src/ui/errorAlert';
import { LiveText } from '../../src/ui/LiveText';
import { UndoBar } from '../../src/ui/UndoBar';

export default function CardView() {
  const { id, show } = useLocalSearchParams<{ id: string; show?: string }>();
  const { cards, folders, services, refresh, undo, cardBrightness } = useApp();
  const confirmIdShare = useConfirmIdShare();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  // Show to staff: the phone is handed over, so nothing on screen may lead anywhere else until the
  // owner holds the finish button. Back, swipe-to-dismiss and every action are off.
  const [staff, setStaff] = useState(show === '1');
  const [staffSide, setStaffSide] = useState<'front' | 'back'>('front');
  const [pdfPage, setPdfPage] = useState(0);
  const [holdHint, setHoldHint] = useState(false);
  // The photos, or the card's details and scanned text as the Markdown file it can be saved as.
  const [view, setView] = useState<'card' | 'details'>('card');
  const [tagging, setTagging] = useState(false);
  const [more, setMore] = useState(false);
  const [recreating, setRecreating] = useState(false);

  useMaxBrightness(staff || cardBrightness);
  useAllowLandscape();

  useEffect(() => {
    if (!staff) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [staff]);

  const card = cards.find((c) => c.id === id);
  // Hooks run on every render; a missing card or back just loads nothing.
  const frontUri = useCardImage(card, 'front');
  const backUri = useCardImage(card?.hasBack ? card : undefined, 'back');
  const pdf = useCardPdf(card);

  if (!card) {
    return (
      <Screen style={[styles.padded, { paddingTop: insets.top + 16 }]}>
        <Panel style={styles.padded}>
          <Text style={{ color: theme.text }}>{strings.card.notFound}</Text>
          <Button label={strings.common.close} onPress={() => router.back()} />
        </Panel>
      </Screen>
    );
  }

  // An ID asks once before an unencrypted copy leaves the app, unless the warning is turned off.
  const confirmIfId = (go: () => unknown) =>
    confirmIdShare({
      hasId: isId(card),
      title: strings.card.shareIdTitle,
      body: strings.card.shareIdBody,
      go,
    });

  const markdown = cardMarkdown(card, folders);
  const saveMarkdown = () =>
    confirmIfId(() =>
      shareCardMarkdown(card, markdown).catch((e) => {
        console.warn('Saving the .md file failed', e);
        showError('saveMarkdown', e);
      }),
    );

  // Recreate .md: reads the text on the document's pictures again, which its Details are made from.
  const recreateMarkdown = async () => {
    if (!canReadText) {
      showError('readTextUnavailable', null);
      return;
    }
    setRecreating(true);
    try {
      const saved = await rereadCard(services.store, card, readPhotoText);
      await refresh().catch((e) => console.warn('Refresh after reading again failed', e));
      if (!saved) throw new Error('The document changed while it was being read');
    } catch (e) {
      console.warn('Reading the document again failed', e);
      showError('reread', e);
    } finally {
      setRecreating(false);
    }
  };

  // With the Details (.md) view open, Quick share sends that Markdown file only, not the pictures.
  const share = () =>
    view === 'details'
      ? saveMarkdown()
      : confirmIfId(() =>
          shareCard(services.store, card).catch((e) => {
            console.warn('Share failed', e);
            showError('share', e);
          }),
        );

  // The whole card as one PDF, even a front-only photo card, straight to the share sheet, which
  // also offers saving it to Files.
  const exportPdf = () =>
    confirmIfId(() =>
      exportCardPdf(services.store, card).catch((e) => {
        console.warn('PDF export failed', e);
        showError('exportPdf', e);
      }),
    );

  // No dialog: the card goes to Recently deleted at once and home offers Undo.
  const deleteCard = async () => {
    try {
      await deleteWithUndo(services.store, undo, card, refresh);
    } catch (e) {
      console.warn('Delete failed', e);
      showError('delete', e);
      return;
    }
    router.back();
  };

  const togglePin = async () => {
    try {
      await services.store.setPinned(card.id, !card.pinned);
    } catch (e) {
      console.warn('Pin failed', e);
      showError(card.pinned ? 'unpin' : 'pin', e);
      return;
    }
    await refresh().catch((e) => console.warn('Refresh after pin failed', e));
  };

  const now = new Date();
  const expiry = expiryStatus(card, now).kind;
  // Expired is the one state worth colour; soon is just brighter than an ordinary date.
  const expiryColor = expiry === 'expired' ? theme.danger : expiry === 'soon' || expiry === 'today' ? theme.text : theme.muted;

  // One tap takes the tag off at once; the Undo bar below puts it back.
  const removeTagFromCard = async (tag: string) => {
    try {
      await removeTagWithUndo(services.store, undo, card, tag, refresh);
    } catch (e) {
      console.warn('Removing the tag failed', e);
      showError('tags', e);
    }
  };

  const addTagsToCard = (tags: string[]) => {
    if (overTagLimit([card], tags).length > 0) {
      Alert.alert(strings.tags.tooManyTitle, strings.tags.tooMany(1, MAX_TAGS));
      return;
    }
    setTagging(false);
    void saveTags(() => addTags(services.store, [card], tags));
  };

  const saveTags = async (run: () => Promise<unknown>) => {
    try {
      const failed = await run();
      if (typeof failed === 'number' && failed > 0) throw new Error('Saving tags failed');
    } catch (e) {
      console.warn('Saving tags failed', e);
      showError('tags', e);
    }
    await refresh().catch((e) => console.warn('Refresh after tags failed', e));
  };

  const sides = [{ label: strings.card.front, uri: frontUri }];
  if (card.hasBack) sides.push({ label: strings.card.back, uri: backUri });

  const startStaff = () => {
    setView('card');
    setStaff(true);
  };

  const finishStaff = () => {
    setStaff(false);
    setHoldHint(false);
  };

  if (staff) {
    return (
      <>
        <Stack.Screen options={{ gestureEnabled: false }} />
        <StatusBar hidden />
        <Modal
          testID="staff-modal"
          visible
          presentationStyle="fullScreen"
          supportedOrientations={['portrait', 'landscape-left', 'landscape-right']}
          statusBarTranslucent
          navigationBarTranslucent
          onRequestClose={() => { /* Only holding Finish may leave staff mode. */ }}
        >
          <View style={[styles.staff, { backgroundColor: theme.counterBg }]} testID="staff-view">
            {card.pdf ? (
              <PdfPager pdfBase64={pdf} pageCount={card.pdf.pageCount} name={displayName(card)} initialPage={pdfPage} onPageChange={setPdfPage} showPageNumber={false} />
            ) : (
              <ZoomableImage
                key={staffSide}
                uri={staffSide === 'back' ? backUri : frontUri}
                accessibilityLabel={strings.card.imageLabel(displayName(card), strings.card[staffSide])}
              />
            )}
            <View pointerEvents="box-none" style={[styles.staffOverlay, { bottom: insets.bottom + 8, start: insets.left + 8, end: insets.right + 8 }]}>
              {holdHint && (
                <LiveText style={[styles.hint, { color: theme.text, backgroundColor: theme.surface }]}>
                  {strings.card.staffHoldReminder}
                </LiveText>
              )}
              <View style={styles.staffControls}>
                {!card.pdf && card.hasBack && (
                  <Button
                    variant="secondary"
                    label={strings.card.flip}
                    onPress={() => setStaffSide((side) => side === 'front' ? 'back' : 'front')}
                    testID="flip-card"
                  />
                )}
                <Button
                  variant="secondary"
                  label={strings.card.staffDone}
                  accessibilityHint={strings.card.staffDoneHint}
                  onPress={() => setHoldHint(true)}
                  onLongPress={finishStaff}
                  testID="finish-staff"
                />
              </View>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  const footer = landscape ? (
    // Sideways there's room for the photos or the actions, not both: only Close stays.
    <Panel style={styles.footer}>
      <Button label={strings.common.close} onPress={() => router.back()} testID="close-card" />
    </Panel>
  ) : (
    // Show is the primary counter action; Close stays below it in the thumb zone.
    <Panel style={styles.footer} testID="card-footer">
      <View style={styles.actions} testID="card-actions">
        <IconButton
          icon="share"
          label={strings.card.share}
          caption={strings.card.captions.share}
          hint={view === 'details' ? strings.card.shareMarkdownHint : strings.card.shareHint}
          onPress={share}
          testID="share-card"
        />
        <IconButton
          icon={card.pinned ? 'unpin' : 'pin'}
          label={card.pinned ? strings.card.unpin : strings.card.pin}
          caption={card.pinned ? strings.card.captions.unpin : strings.card.captions.pin}
          onPress={togglePin}
          testID="pin-card"
        />
        <IconButton
          icon="more"
          label={strings.card.more}
          caption={strings.card.captions.more}
          hint={strings.card.moreHint}
          expanded={more}
          onPress={() => setMore(true)}
          testID="more-card"
        />
      </View>
      <Button
        label={strings.card.showToStaff}
        accessibilityHint={strings.card.staffHint}
        onPress={startStaff}
        testID="show-to-staff"
      />
      <Button variant="secondary" label={strings.common.close} onPress={() => router.back()} testID="close-card" />
    </Panel>
  );

  return (
    <Screen
      style={{
        paddingTop: insets.top + 8,
        paddingBottom: insets.bottom + 8,
        paddingLeft: insets.left,
        paddingRight: insets.right,
        gap: landscape ? 8 : 16,
      }}
    >
      <Stack.Screen options={{ gestureEnabled: true }} />
      <StatusBar hidden={false} />
      {/* Sideways, the photos get the height; the name and details come back upright. */}
      {!landscape && (
        <View style={[styles.inset, styles.top]}>
          <Panel style={styles.header} testID="card-header">
            <View style={styles.titleRow}>
              <Text style={[styles.title, styles.flex, { color: theme.text }]} numberOfLines={1} accessibilityRole="header">
                {displayName(card)}
              </Text>
            </View>
            <View style={styles.expiryRow}>
              {needsExpiryAlert(card, now) && <ExpiryAlert size={18} pop testID="card-expiry-alert" />}
              <Text style={[styles.meta, { color: expiryColor }]} testID="card-expiry">
                {expiryLabel(card, now)}
              </Text>
            </View>
            {!staff && (
              <View style={styles.tags} testID="card-tags">
                {card.tags.map((tag) => (
                  <TagPill key={tag} tag={tag} onRemove={(tag) => void removeTagFromCard(tag)} testID={`tag-${tag}`} />
                ))}
                <AddTagPill onPress={() => setTagging(true)} />
              </View>
            )}
          </Panel>
          {!staff && (
            <ChipRow
              accessibilityLabel={strings.card.views}
              chips={[
                { key: 'card', label: strings.card.viewCard, selected: view === 'card', onPress: () => setView('card'), testID: 'view-card' },
                {
                  key: 'details',
                  label: strings.card.viewDetails,
                  selected: view === 'details',
                  onPress: () => setView('details'),
                  testID: 'view-details',
                },
              ]}
            />
          )}
        </View>
      )}

      {/* The photos sit straight on the page: the card is the card, panels are only the chrome.
          In landscape the front and back sit side by side, for staff who need to see both. */}
      {view === 'details' && !landscape ? (
        <Animated.View key="details" entering={FadeIn.duration(180).easing(EASE_OUT)} style={[styles.inset, styles.sides]}>
          <Panel style={styles.details}>
            <ScrollView contentContainerStyle={styles.detailsText}>
              <Text selectable style={[styles.markdown, { color: theme.text }]} testID="card-markdown">
                {markdown}
              </Text>
            </ScrollView>
          </Panel>
          <View style={styles.detailsActions}>
            <View style={styles.flex}>
              <Button
                variant="secondary"
                label={recreating ? strings.recreate.working : strings.recreate.button}
                accessibilityHint={strings.recreate.hint}
                onPress={() => void recreateMarkdown()}
                disabled={recreating}
                testID="recreate-markdown"
              />
            </View>
            <View style={styles.flex}>
              <Button
                variant="secondary"
                label={strings.card.saveMarkdown}
                accessibilityHint={strings.card.saveMarkdownHint}
                onPress={saveMarkdown}
                testID="save-markdown"
              />
            </View>
          </View>
        </Animated.View>
      ) : (
        <View style={[styles.inset, styles.sides, landscape && styles.sidesRow]} testID="card-sides">
          {card.pdf ? (
            <PdfPager pdfBase64={pdf} pageCount={card.pdf.pageCount} name={displayName(card)} initialPage={pdfPage} onPageChange={setPdfPage} />
          ) : sides.map((side) => (
            <View key={side.label} style={styles.side}>
              <Text style={{ fontSize: 14, color: theme.muted, textAlign: 'center' }}>{side.label}</Text>
              <View style={styles.frame}>
                <ZoomableImage uri={side.uri} accessibilityLabel={strings.card.imageLabel(displayName(card), side.label)} />
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.inset}>
        {/* The same Undo offer home shows, e.g. after a tag is removed. */}
        <UndoBar undo={undo} />
        {footer}
      </View>
      <ActionSheet
        visible={more}
        title={strings.card.moreTitle}
        onClose={() => setMore(false)}
        testID="card-more-sheet"
        actions={[
          { key: 'pdf', icon: 'pdf', label: strings.card.exportPdf, hint: strings.card.exportPdfHint, onPress: exportPdf, testID: 'export-pdf' },
          { key: 'edit', icon: 'edit', label: strings.card.edit, onPress: () => router.push(`/edit/${card.id}`), testID: 'edit-card' },
          { key: 'delete', icon: 'trash', variant: 'danger', label: strings.edit.deleteCard, onPress: () => void deleteCard(), testID: 'delete-card' },
        ]}
      />
      <TagSheet
        visible={tagging}
        title={strings.tags.titleOne}
        existing={tagOptions(cards).filter((t) => !hasTag(card, t))}
        onApply={addTagsToCard}
        onClose={() => setTagging(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  staff: { flex: 1, padding: 0, overflow: 'hidden' },
  staffControls: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 },
  staffOverlay: { position: 'absolute', alignItems: 'flex-end', gap: 8 },
  padded: { padding: 16, gap: 12 },
  inset: { paddingHorizontal: 16 },
  header: { paddingHorizontal: 20, paddingVertical: 12, gap: 6 },
  title: { fontSize: TYPE.section, fontWeight: '700', letterSpacing: TRACKING.tight },
  meta: { fontSize: TYPE.secondary, fontWeight: '600' },
  expiryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  // The card's tags as small pills under its expiry, wrapping onto more lines when there are many.
  tags: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  sides: { flex: 1, gap: 16 },
  sidesRow: { flexDirection: 'row' },
  side: { flex: 1, gap: 4 },
  frame: { flex: 1 },
  footer: { gap: 12, padding: 12 },
  top: { gap: 8 },
  details: { flex: 1, overflow: 'hidden' },
  detailsText: { padding: 16 },
  detailsActions: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  // Shown as the file it saves as: monospaced, so the Markdown reads as written.
  markdown: { fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), fontSize: 13, lineHeight: 19 },
  // Share, Pin and More keep their compact captioned actions.
  actions: { flexDirection: 'row', gap: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hint: { fontSize: TYPE.secondary, textAlign: 'center' },
});

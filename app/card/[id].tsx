import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, BackHandler, Platform, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/app/AppProvider';
import { useAllowLandscape } from '../../src/hooks/useAllowLandscape';
import { useMaxBrightness } from '../../src/hooks/useMaxBrightness';
import { ZoomableImage } from '../../src/ui/ZoomableImage';
import { Button } from '../../src/ui/Button';
import { IconButton } from '../../src/ui/IconButton';
import { Panel, Screen } from '../../src/ui/Surface';
import { Text } from '../../src/ui/Text';
import { TYPE, useTheme } from '../../src/ui/theme';
import { useCardImage } from '../../src/hooks/useCardImage';
import { useCardPdf } from '../../src/hooks/usePdf';
import { PdfPager } from '../../src/ui/PdfPager';
import { displayName } from '../../src/cards/display';
import { expiryLabel, expiryStatus, needsExpiryAlert } from '../../src/cards/expiry';
import { ExpiryAlert } from '../../src/ui/ExpiryAlert';
import { exportCardPdf, PdfUnavailableError, shareCard, shareCardMarkdown } from '../../src/share/shareCard';
import { cardMarkdown } from '../../src/cards/cardMarkdown';
import { addTags, allTags, overTagLimit, removeTag } from '../../src/cards/batch';
import { MAX_TAGS } from '../../src/config';
import { AddTagPill, TagPill } from '../../src/ui/TagPill';
import { TagSheet } from '../../src/ui/TagSheet';
import { canReadText, readPhotoText } from '../../src/analysis/readPhoto';
import { rereadCard } from '../../src/cards/readBackfill';
import { ChipRow } from '../../src/ui/ChipRow';
import { EASE_OUT } from '../../src/ui/motion';
import { strings } from '../../src/strings';

export default function CardView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { cards, folders, services, refresh, cardBrightness } = useApp();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  // Show to staff: the phone is handed over, so nothing on screen may lead anywhere else until the
  // owner holds the finish button. Back, swipe-to-dismiss and every action are off.
  const [staff, setStaff] = useState(false);
  const [holdHint, setHoldHint] = useState(false);
  // The photos, or the card's details and scanned text as the Markdown file it can be saved as.
  const [view, setView] = useState<'card' | 'details'>('card');
  const [tagging, setTagging] = useState(false);
  const [recreating, setRecreating] = useState(false);

  useMaxBrightness(cardBrightness);
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

  // An ID is the one card worth a second thought before an unencrypted copy leaves the app.
  const confirmIfId = (action: string, go: () => void) => {
    if (card.category === 'id') {
      Alert.alert(strings.card.shareIdTitle, strings.card.shareIdBody, [
        { text: strings.common.cancel, style: 'cancel' },
        { text: action, onPress: go },
      ]);
    } else {
      go();
    }
  };

  const markdown = cardMarkdown(card, folders);
  const saveMarkdown = () =>
    confirmIfId(strings.card.saveMarkdown, () =>
      shareCardMarkdown(card, markdown).catch((e) => {
        console.warn('Saving the .md file failed', e);
        Alert.alert(strings.common.error);
      }),
    );

  // Recreate .md: reads the text on the document's pictures again, which its Details are made from.
  const recreateMarkdown = async () => {
    if (!canReadText) {
      Alert.alert(strings.common.error, strings.recreate.unavailable);
      return;
    }
    setRecreating(true);
    try {
      const saved = await rereadCard(services.store, card, readPhotoText);
      await refresh().catch((e) => console.warn('Refresh after reading again failed', e));
      if (!saved) throw new Error('The document changed while it was being read');
    } catch (e) {
      console.warn('Reading the document again failed', e);
      Alert.alert(strings.common.error);
    } finally {
      setRecreating(false);
    }
  };

  // With the Details (.md) view open, Quick share sends that Markdown file only, not the pictures.
  const share = () =>
    view === 'details'
      ? saveMarkdown()
      : confirmIfId(strings.card.share, () =>
          shareCard(services.store, card).catch((e) => {
            console.warn('Share failed', e);
            Alert.alert(strings.common.error);
          }),
        );

  // Save to Files or send: either way the whole card as one PDF, even a front-only photo card.
  const exportPdf = () =>
    confirmIfId(strings.card.exportPdf, () => {
      const run = (to: 'send' | 'files') =>
        exportCardPdf(services.store, card, to)
          .then((saved) => {
            if (saved) Alert.alert(strings.card.exportPdfTitle, strings.card.exportPdfSaved(saved));
          })
          .catch((e) => {
            console.warn('PDF export failed', e);
            Alert.alert(strings.common.error, e instanceof PdfUnavailableError ? strings.card.exportPdfNeedsUpdate : undefined);
          });
      Alert.alert(strings.card.exportPdfTitle, strings.card.exportPdfBody, [
        { text: strings.common.cancel, style: 'cancel' },
        { text: strings.card.exportPdfSend, onPress: () => void run('send') },
        { text: strings.card.exportPdfSave, onPress: () => void run('files') },
      ]);
    });

  const confirmDelete = () =>
    Alert.alert(strings.edit.deleteConfirmTitle, strings.edit.deleteConfirmBody, [
      { text: strings.common.cancel, style: 'cancel' },
      {
        text: strings.common.delete,
        style: 'destructive',
        onPress: async () => {
          try {
            await services.store.remove(card.id);
          } catch (e) {
            console.warn('Delete failed', e);
            Alert.alert(strings.common.error);
            return;
          }
          await refresh().catch((e) => console.warn('Refresh after delete failed', e));
          router.back();
        },
      },
    ]);

  const togglePin = async () => {
    try {
      await services.store.setPinned(card.id, !card.pinned);
    } catch (e) {
      console.warn('Pin failed', e);
      Alert.alert(strings.common.error);
      return;
    }
    await refresh().catch((e) => console.warn('Refresh after pin failed', e));
  };

  const now = new Date();
  const expiry = expiryStatus(card, now).kind;
  // Expired is the one state worth colour; soon is just brighter than an ordinary date.
  const expiryColor = expiry === 'expired' ? theme.danger : expiry === 'soon' || expiry === 'today' ? theme.text : theme.muted;

  // Holding a tag for two seconds asks before taking it off this card.
  const confirmRemoveTag = (tag: string) =>
    Alert.alert(strings.tags.removeTitle, strings.tags.removeBody(tag), [
      { text: strings.common.cancel, style: 'cancel' },
      {
        text: strings.tags.remove,
        style: 'destructive',
        onPress: () => void saveTags(() => removeTag(services.store, card, tag)),
      },
    ]);

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
      Alert.alert(strings.common.error);
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

  const footer = staff ? (
    <Panel style={styles.footer} radius={28}>
      {holdHint && (
        <Text style={[styles.hint, { color: theme.muted }]} accessibilityLiveRegion="polite">
          {strings.card.staffHoldReminder}
        </Text>
      )}
      <Button
        variant="secondary"
        label={strings.card.staffDone}
        accessibilityHint={strings.card.staffDoneHint}
        onPress={() => setHoldHint(true)}
        onLongPress={finishStaff}
        testID="finish-staff"
      />
    </Panel>
  ) : landscape ? (
    // Sideways there's room for the photos or the actions, not both: only Close stays.
    <Panel style={styles.footer} radius={28}>
      <Button label={strings.common.close} onPress={() => router.back()} testID="close-card" />
    </Panel>
  ) : (
    /* Every action in the thumb zone: the card's actions as icons in a row, and Close, the one
       you need most, full width at the bottom. Delete asks first. */
    <Panel style={styles.footer} radius={28}>
      <View style={styles.actions}>
        <IconButton icon="trash" variant="danger" label={strings.edit.deleteCard} onPress={confirmDelete} testID="delete-card" />
        <IconButton
          icon="share"
          label={strings.card.share}
          hint={view === 'details' ? strings.card.shareMarkdownHint : strings.card.shareHint}
          onPress={share}
          testID="share-card"
        />
        <IconButton icon="pdf" label={strings.card.exportPdf} hint={strings.card.exportPdfHint} onPress={exportPdf} testID="export-pdf" />
        <IconButton
          icon={card.pinned ? 'unpin' : 'pin'}
          label={card.pinned ? strings.card.unpin : strings.card.pin}
          onPress={togglePin}
          testID="pin-card"
        />
        <IconButton
          icon="present"
          label={strings.card.showToStaff}
          hint={strings.card.staffHint}
          onPress={startStaff}
          testID="show-to-staff"
        />
        <IconButton icon="edit" label={strings.card.edit} onPress={() => router.push(`/edit/${card.id}`)} testID="edit-card" />
      </View>
      <Button label={strings.common.close} onPress={() => router.back()} testID="close-card" />
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
      <Stack.Screen options={{ gestureEnabled: !staff }} />
      {/* Sideways, the photos get the height; the name and details come back upright. */}
      {!landscape && (
        <View style={[styles.inset, styles.top]}>
          <Panel style={styles.header} radius={24}>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={1} accessibilityRole="header">
              {displayName(card)}
            </Text>
            <View style={styles.expiryRow}>
              {needsExpiryAlert(card, now) && <ExpiryAlert size={18} pop testID="card-expiry-alert" />}
              <Text style={[styles.meta, { color: expiryColor }]} testID="card-expiry">
                {expiryLabel(card, now)}
              </Text>
            </View>
            {!staff && (
              <View style={styles.tags} testID="card-tags">
                {card.tags.map((tag) => (
                  <TagPill key={tag} tag={tag} onRemove={confirmRemoveTag} testID={`tag-${tag}`} />
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
      {view === 'details' && !landscape && !staff ? (
        <Animated.View key="details" entering={FadeIn.duration(180).easing(EASE_OUT)} style={[styles.inset, styles.sides]}>
          <Panel style={styles.details} radius={24}>
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
            <PdfPager pdfBase64={pdf} pageCount={card.pdf.pageCount} name={displayName(card)} />
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

      <View style={styles.inset}>{footer}</View>
      <TagSheet
        visible={tagging}
        title={strings.tags.titleOne}
        existing={allTags(cards).filter((t) => !card.tags.some((own) => own.toLocaleLowerCase() === t.toLocaleLowerCase()))}
        onApply={addTagsToCard}
        onClose={() => setTagging(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  padded: { padding: 16, gap: 12 },
  inset: { paddingHorizontal: 16 },
  header: { paddingHorizontal: 20, paddingVertical: 12, gap: 6 },
  title: { fontSize: TYPE.section, fontWeight: '700' },
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
  // Five icon buttons: an 8 pt gap keeps each well over 44 pt wide on a 375 pt phone.
  actions: { flexDirection: 'row', gap: 8 },
  hint: { fontSize: TYPE.secondary, textAlign: 'center' },
});

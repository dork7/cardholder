import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, BackHandler, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { FONT, Text } from '../src/ui/Text';
import { useApp } from '../src/app/AppProvider';
import { useLaunchLinks } from '../src/app/useLaunchLinks';
import { addTags, overTagLimit, setBlurPreview, shouldUnpin, togglePinned } from '../src/cards/batch';
import { allTags, isId, sameTag, tagOptions } from '../src/cards/tags';
import { filterCards, isExpiringSoon, isGallerySort, sortForGallery, splitPinned } from '../src/cards/listing';
import { EXPIRY_SOON_DAYS, FOLDERS_ENABLED, MAX_TAGS } from '../src/config';
import { canAddCard } from '../src/purchases/limits';
import { shareCards } from '../src/share/shareCard';
import { confirmIdShare } from '../src/share/idWarning';
import { strings } from '../src/strings';
import { showError } from '../src/ui/errorAlert';
import { Button } from '../src/ui/Button';
import { CardGrid } from '../src/ui/CardGrid';
import { TagSheet } from '../src/ui/TagSheet';
import { canReadText, readPhotoText } from '../src/analysis/readPhoto';
import { rereadCards } from '../src/cards/readBackfill';
import { CardStack } from '../src/ui/CardStack';
import { AppearanceToggle } from '../src/ui/AppearanceToggle';
import { TagChips } from '../src/ui/TagChips';
import { ChipRow } from '../src/ui/ChipRow';
import { HomeActionBar } from '../src/ui/HomeActionBar';
import { UndoBar } from '../src/ui/UndoBar';
import { deleteAllWithUndo } from '../src/cards/deleteWithUndo';
import { IconButton } from '../src/ui/IconButton';
import { Card } from '../src/cards/types';
import { RetroIcon } from '../src/ui/RetroIcon';
import { PinnedStrip } from '../src/ui/PinnedStrip';
import { Panel, Screen } from '../src/ui/Surface';
import { RADIUS, TRACKING, TYPE, useTheme } from '../src/ui/theme';
import { useTooltip } from '../src/ui/Tooltip';
import { LiveText } from '../src/ui/LiveText';
import { GestureTip, GestureTipName, useGestureTips } from '../src/ui/GestureTip';
import { SortSheet } from '../src/ui/SortSheet';

// Panels settle in from just off their resting place; Reanimated skips this under Reduce Motion.
const ENTER = 360;

export default function Home() {
  const {
    cards,
    folders,
    unlocked,
    openImportOnReady,
    clearOpenImport,
    homeFolders,
    services,
    refresh,
    undo,
    stackVertical,
    warnIdShare,
    setWarnIdShare,
  } = useApp();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  useLaunchLinks();
  const [query, setQuery] = useState('');
  const [chosen, setChosen] = useState<string | null>(null);
  // Only tags some card has are offered; if the chosen tag's last card goes, fall back to All.
  const present = allTags(cards);
  const tag = (chosen && present.find((t) => sameTag(t, chosen))) || null;
  const [chosenFolder, setChosenFolder] = useState<string | null>(null);
  // Falls back to all cards if the chosen folder is deleted, or the filter is hidden.
  const folderId =
    FOLDERS_ENABLED &&
    homeFolders.filter && chosenFolder && folders.some((f) => f.id === chosenFolder) ? chosenFolder : null;
  const folderChips = homeFolders.filter
    ? [
          {
            key: 'all',
            label: strings.folders.all,
            selected: folderId === null,
            onPress: () => setChosenFolder(null),
            testID: 'folder-filter-all',
          },
          ...folders.map((f) => ({
            key: f.id,
            label: f.name,
            selected: folderId === f.id,
            onPress: () => setChosenFolder(f.id),
            testID: `folder-filter-${f.id}`,
          })),
      ]
    : [];
  const shown = filterCards(cards, { query, tag, folderId });
  const { pinned } = splitPinned(cards);
  const [gallery, setGallery] = useSavedChoice('homeView', (v): v is 'gallery' | 'stack' => v === 'gallery' || v === 'stack', 'stack');
  const [sort, setSort] = useSavedChoice('gallerySort', isGallerySort, 'name');
  const [expiringChoice, setExpiringChoice] = useSavedChoice('galleryExpiring', (v): v is 'on' | 'off' => v === 'on' || v === 'off', 'off');
  const expiringOnly = expiringChoice === 'on';
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const now = new Date();
  // The gallery has its own order and an "Expiring soon" filter on top of search and tag.
  const inGallery = sortForGallery(expiringOnly ? shown.filter((c) => isExpiringSoon(c, now)) : shown, sort);
  // Only cards still on screen count as selected, so a filter change can't act on something hidden.
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const selected = inGallery.filter((c) => selectedIds.has(c.id));
  const [choosingTags, setChoosingTags] = useState(false);
  // While the selection is being read again: how many are done, out of how many.
  const [rereading, setRereading] = useState<{ done: number; of: number } | null>(null);
  const selecting = gallery === 'gallery' && selected.length > 0;
  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);
  // One-time tips on the stack's swipe and the gallery's long-press, which only screen readers were told about.
  const tips = useGestureTips(services.settings);
  const tipBar = (tip: GestureTipName, text: string) =>
    tips.showing(tip) && (
      <GestureTip
        text={text}
        announce={!tips.announced(tip)}
        onAnnounced={() => tips.markAnnounced(tip)}
        onDismiss={() => tips.done(tip)}
        testID={`${tip}-tip`}
      />
    );
  // The blur button on the stack's front card: saved straight away, like the choice on the edit screen.
  const toggleBlur = async (card: Card) => {
    try {
      await setBlurPreview(services.store, card, !card.blurPreview);
      await refresh();
    } catch (e) {
      console.warn('Changing the blur failed', e);
      showError('blur', e);
    }
  };

  // A long-press starts selecting, so the gallery's tip has done its job.
  const toggleSelected = (card: Card) => {
    tips.done('gallery');
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(card.id)) next.delete(card.id);
      else next.add(card.id);
      return next;
    });
  };

  // The system back gesture leaves selection first, as in a photo gallery.
  useEffect(() => {
    if (!selecting) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      clearSelection();
      return true;
    });
    return () => sub.remove();
  }, [selecting, clearSelection]);

  // Runs a batch action on the selection, then leaves selection and reloads the cards.
  const onSelection = async (
    run: (cards: Card[]) => Promise<number>,
    failure: (n: number) => { title: string; body: string },
  ) => {
    const failed = await run(selected);
    clearSelection();
    await refresh().catch((e) => console.warn('Refresh after a batch action failed', e));
    if (failed > 0) {
      const { title, body } = failure(failed);
      Alert.alert(title, body);
    }
  };

  // Adds the chosen tags to every selected card. If any card would go over the limit, nothing is
  // changed and the sheet stays open, so fewer tags can be chosen.
  const tagSelected = (tags: string[]) => {
    const over = overTagLimit(selected, tags);
    if (over.length > 0) {
      Alert.alert(strings.tags.tooManyTitle, strings.tags.tooMany(over.length, MAX_TAGS));
      return;
    }
    setChoosingTags(false);
    void onSelection((picked) => addTags(services.store, picked, tags), strings.errors.tagMany);
  };

  // Recreate .md on the selection: reads each document's text again from its pictures, which its
  // Details (.md) are made from. Can take a while, so the bar counts through them.
  const recreateSelected = async () => {
    if (!canReadText) {
      showError('readTextUnavailable', null);
      return;
    }
    const picked = selected;
    setRereading({ done: 0, of: picked.length });
    const failed = await rereadCards(services.store, picked, readPhotoText, (done) => setRereading({ done, of: picked.length }));
    setRereading(null);
    clearSelection();
    await refresh().catch((e) => console.warn('Refresh after reading again failed', e));
    Alert.alert(
      strings.recreate.button,
      failed > 0 ? strings.home.selectionFailed(failed) : strings.recreate.doneMany(picked.length),
    );
  };

  // No dialog: the selection goes to Recently deleted at once and one Undo brings it all back.
  const deleteSelected = () =>
    onSelection((cards) => deleteAllWithUndo(services.store, undo, cards, refresh), strings.errors.deleteMany);

  // One PDF of every selected card. An ID asks first, as on the card's own screen, unless the
  // warning is turned off. Selection stays, so the same cards can be sent elsewhere.
  const shareSelected = () => {
    const picked = selected;
    confirmIdShare({
      hasId: picked.some(isId),
      warn: warnIdShare,
      title: strings.home.shareIdsTitle,
      body: strings.home.shareIdsBody,
      go: () =>
        shareCards(services.store, picked).catch((e) => {
          console.warn('Share failed', e);
          showError('shareMany', e);
        }),
      stopWarning: () => setWarnIdShare(false),
    });
  };

  const sortName = sort === 'name' ? strings.home.sortName : sort === 'expiry' ? strings.home.sortExpiry : strings.home.sortAdded;

  // "Import backup" on the recovery screen lands here first, then opens the import flow.
  useEffect(() => {
    if (!openImportOnReady) return;
    clearOpenImport();
    router.push('/import');
  }, [openImportOnReady, clearOpenImport, router]);

  // At the free limit, adding leads to the one-time purchase instead (Task 16).
  const addCard = () => router.push(canAddCard(cards.length, unlocked) ? '/edit/new' : '/paywall');

  // A plain View: the screen fits without scrolling, so nothing competes with the stack for swipes.
  return (
    <Screen style={{ paddingTop: insets.top + 8, paddingBottom: 0 }}>
      <Animated.View entering={FadeInDown.duration(ENTER)} style={[styles.inset, styles.top]}>
        <Panel style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
            {strings.home.title}
          </Text>
          <AppearanceToggle />
          <SettingsButton onPress={() => router.push('/settings')} />
        </Panel>
        {cards.length > 0 && <SearchField value={query} onChange={setQuery} />}
        {/* Pinned cards stay put while searching or filtering: they're the shortcut, the stack is the browse. */}
        <PinnedStrip cards={pinned} onOpen={(card) => router.push(`/card/${card.id}`)} />
      </Animated.View>

      {/* The stack and filters use the space above the floating action bar. */}
      <View style={[styles.inset, styles.body]}>
        {cards.length === 0 ? (
          <View style={styles.empty} testID="empty-state">
            <View style={[styles.emptyIcon, { backgroundColor: theme.glassStrong, borderColor: theme.border }]}>
              <RetroIcon name="folder" size={64} color={theme.accent} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]} accessibilityRole="header">
              {strings.home.emptyTitle}
            </Text>
            <Text style={[styles.promise, { color: theme.muted }]}>{strings.promise}</Text>
            <Text style={[styles.promise, { color: theme.text }]}>{strings.home.emptyHint}</Text>
          </View>
        ) : (
          <>
            {gallery === 'gallery' && shown.length > 0 && (
              <Pressable
                onPress={() => setSortSheetOpen(true)}
                accessibilityRole="button"
                accessibilityLabel={strings.home.sortChip(sortName)}
                accessibilityHint={`${strings.home.sortLabel}. ${strings.home.expiringSoon}: ${expiringOnly ? 'on' : 'off'}`}
                testID="sort-chip"
                style={[styles.sortChip, { backgroundColor: theme.glass, borderColor: theme.rosette }]}
              >
                <Text style={{ color: theme.text, fontSize: TYPE.secondary, fontWeight: '700' }}>{strings.home.sortChip(sortName)}</Text>
              </Pressable>
            )}
            {shown.length === 0 ? (
              <LiveText style={[styles.promise, { color: theme.muted }]}>
                {strings.home.noResults}
              </LiveText>
            ) : gallery === 'gallery' ? (
              inGallery.length === 0 ? (
                <LiveText style={[styles.promise, { color: theme.muted }]}>
                  {strings.home.noneExpiring(EXPIRY_SOON_DAYS)}
                </LiveText>
              ) : (
                <>
                  {!selecting && tipBar('gallery', strings.home.galleryTip)}
                  <CardGrid
                    cards={inGallery}
                    selected={selectedIds}
                    onOpen={(card) => router.push(`/card/${card.id}`)}
                    onToggle={toggleSelected}
                  />
                </>
              )
            ) : (
              // Keyed by filter and direction so the stack starts from its first card instead of carrying motion over.
              <CardStack
                key={`${tag ?? 'all'}|${folderId ?? 'all'}|${query.trim().toLowerCase()}|${stackVertical ? 'v' : 'h'}`}
                cards={shown}
                onOpen={(card) => router.push(`/card/${card.id}`)}
                vertical={stackVertical}
                onToggleBlur={(card) => void toggleBlur(card)}
                onMove={() => tips.done('stack')}
              />
            )}
            {gallery === 'stack' &&
              shown.length > 1 &&
              tipBar('stack', stackVertical ? strings.home.stackTipVertical : strings.home.stackTip)}
            {/* Which parts of the folder row show is chosen in settings. */}
            {FOLDERS_ENABLED && folders.length > 0 && (folderChips.length > 0 || homeFolders.manage) && (
              <View style={styles.folderRow}>
                {folderChips.length > 0 && (
                  <View style={styles.folderChoices}>
                    <ChipRow accessibilityLabel={strings.folders.title} chips={folderChips} testID="folder-filter-choices" />
                  </View>
                )}
                {homeFolders.manage && <Button variant="secondary" label={strings.folders.manage} onPress={() => router.push('/folders')} />}
              </View>
            )}
            {present.length > 0 && <TagChips tags={present} selected={tag ? [tag] : []} onPress={setChosen} includeAll />}
          </>
        )}
      </View>

      <SortSheet
        visible={sortSheetOpen}
        sort={sort}
        expiringOnly={expiringOnly}
        onSort={setSort}
        onExpiringOnly={(on) => setExpiringChoice(on ? 'on' : 'off')}
        onClose={() => setSortSheetOpen(false)}
      />

      {selecting ? (
        <View style={[styles.selectionBar, { paddingBottom: 0, backgroundColor: theme.glassStrong, borderColor: theme.border }]} testID="selection-bar">
          <View style={styles.selectionRow}>
            <LiveText style={[styles.selectionCount, { color: theme.text }]}>
              {rereading ? strings.recreate.workingMany(rereading.done, rereading.of) : strings.home.selected(selected.length)}
            </LiveText>
            <View style={styles.selectionAction}>
              <Button variant="secondary" label={strings.common.cancel} onPress={clearSelection} testID="selection-cancel" />
            </View>
          </View>
          <View style={styles.selectionActions}>
            <View style={styles.selectionButton}>
              <IconButton
                icon={shouldUnpin(selected) ? 'unpin' : 'pin'}
                label={shouldUnpin(selected) ? strings.home.unpinSelected : strings.home.pinSelected}
                caption={shouldUnpin(selected) ? strings.home.unpinCaption : strings.home.pinCaption}
                onPress={() => void onSelection((cards) => togglePinned(services.store, cards), strings.errors.pinMany)}
                testID="selection-pin"
              />
            </View>
            <View style={styles.selectionButton}>
              <IconButton
                icon="tag"
                label={strings.home.tagSelected}
                caption={strings.home.tagCaption}
                onPress={() => setChoosingTags(true)}
                testID="selection-tags"
              />
            </View>
            <View style={styles.selectionButton}>
              <IconButton
                icon="refresh"
                label={strings.recreate.button}
                caption={strings.home.readAgainCaption}
                hint={strings.recreate.galleryHint}
                onPress={() => void recreateSelected()}
                disabled={rereading !== null}
                testID="selection-recreate"
              />
            </View>
            <View style={styles.selectionButton}>
              <IconButton
                icon="share"
                label={strings.home.shareSelected}
                caption={strings.home.shareCaption}
                hint={strings.home.shareSelectedHint}
                onPress={shareSelected}
                testID="selection-share"
              />
            </View>
            <View style={styles.selectionButton}>
              <IconButton
                icon="trash"
                label={strings.home.deleteSelected}
                caption={strings.home.deleteCaption}
                onPress={deleteSelected}
                variant="danger"
                testID="selection-delete"
              />
            </View>
          </View>
          <TagSheet
            visible={choosingTags}
            title={strings.home.tagTo(selected.length)}
            existing={tagOptions(cards)}
            onApply={tagSelected}
            onClose={() => setChoosingTags(false)}
          />
        </View>
      ) : (
        <View style={[styles.dock, { paddingBottom: insets.bottom + 16 }]}>
          <UndoBar undo={undo} />
          <HomeActionBar
            gallery={gallery === 'gallery'}
            onAddImage={addCard}
            onNotes={() => router.push('/notes')}
            onToggleGallery={() => {
              clearSelection();
              setGallery(gallery === 'gallery' ? 'stack' : 'gallery');
            }}
          />
        </View>
      )}
    </Screen>
  );
}

// Pill search, as the style asks: a filled field two steps up, with a clear button once there's text.
function SearchField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const theme = useTheme();
  const stroke = { stroke: theme.muted, strokeWidth: 2, strokeLinecap: 'round' as const };
  const clear = useTooltip(strings.home.clearSearch);
  return (
    <View style={[styles.search, { backgroundColor: theme.glassStrong, borderColor: theme.border }]}>
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Circle cx={11} cy={11} r={7} {...stroke} />
        <Path d="M16.5 16.5L21 21" {...stroke} />
      </Svg>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={strings.home.searchPlaceholder}
        placeholderTextColor={theme.muted}
        accessibilityLabel={strings.home.searchLabel}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        style={[styles.searchInput, { color: theme.text }]}
        testID="search"
      />
      {value !== '' && (
        <Pressable
          ref={clear.ref}
          onPress={() => onChange('')}
          onLongPress={clear.onLongPress}
          accessibilityRole="button"
          accessibilityLabel={strings.home.clearSearch}
          hitSlop={8}
          style={styles.clear}
        >
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path d="M6 6l12 12M18 6L6 18" {...stroke} stroke={theme.text} />
          </Svg>
          {clear.tooltip}
        </Pressable>
      )}
    </View>
  );
}

function SettingsButton({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  const { ref, onLongPress, tooltip } = useTooltip(strings.home.settings);
  return (
    <Pressable
      ref={ref}
      onPress={onPress}
      onLongPress={onLongPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={strings.home.settings}
      testID="open-settings"
      style={({ pressed }) => [styles.round, { backgroundColor: theme.glassStrong, borderColor: theme.border, opacity: pressed ? 0.6 : 1 }]}
    >
      <RetroIcon name="settings" size={24} />
      {tooltip}
    </Pressable>
  );
}

// Choices kept in settings, so the home screen opens the way it was left.
function useSavedChoice<T extends string>(key: 'homeView' | 'gallerySort' | 'galleryExpiring', isValid: (v: unknown) => v is T, fallback: T) {
  const { services } = useApp();
  const [value, setValue] = useState<T>(fallback);
  useEffect(() => {
    let live = true;
    services.settings
      .get(key)
      .then((saved) => live && isValid(saved) && setValue(saved))
      .catch(() => {});
    return () => {
      live = false;
    };
    // isValid is a plain module-level check; it never changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [services, key]);
  const change = useCallback(
    (next: T) => {
      setValue(next);
      services.settings.set(key, next).catch((e) => console.warn(`Saving ${key} failed`, e));
    },
    [services, key],
  );
  return [value, change] as const;
}

const styles = StyleSheet.create({
  sortChip: { alignSelf: 'flex-start', minHeight: 44, paddingHorizontal: 16, justifyContent: 'center', borderWidth: 1, borderRadius: RADIUS.sm },
  folderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  folderChoices: { flex: 1, minWidth: 0 },
  dock: { paddingHorizontal: 16, paddingTop: 8 },
  selectionBar: { position: 'absolute', left: 8, right: 8, bottom: 8, gap: 10, paddingHorizontal: 16, paddingTop: 12, borderWidth: 1, borderRadius: RADIUS.lg },
  selectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectionActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  selectionButton: { width: '30%' },
  selectionCount: { flex: 1, fontSize: TYPE.secondary, fontWeight: '700' },
  selectionAction: { minWidth: 112 },
  inset: { paddingHorizontal: 16 },
  top: { gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 20, paddingRight: 10, paddingVertical: 10 },
  title: { flex: 1, fontSize: TYPE.title, fontWeight: '700', letterSpacing: TRACKING.tight },
  round: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
    paddingLeft: 16,
    paddingRight: 8,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    shadowColor: '#314570', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 3 },
  },
  searchInput: { flex: 1, minHeight: 48, fontSize: TYPE.body, fontFamily: FONT.regular },
  clear: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, justifyContent: 'center', paddingVertical: 20, gap: 20 },
  empty: { alignItems: 'center', gap: 12 },
  emptyIcon: { width: 124, height: 124, borderRadius: RADIUS.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: TYPE.title, fontWeight: '700', letterSpacing: TRACKING.tight, textAlign: 'center' },
  promise: { fontSize: TYPE.body, textAlign: 'center' },
});

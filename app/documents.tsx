import { PinnedNotes } from '../src/notes/PinnedNotes';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, BackHandler, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { FONT, Text } from '../src/ui/Text';
import { useApp } from '../src/app/AppProvider';
import { addTags, overTagLimit, shouldUnpin, togglePinned } from '../src/cards/batch';
import { allTags, isId, sameTag, tagOptions } from '../src/cards/tags';
import { filterCards, isDocumentSort, isExpiringSoon, sortDocuments, splitPinned } from '../src/cards/listing';
import { useDocumentSearch } from '../src/cards/useDocumentSearch';
import { EXPIRY_SOON_DAYS, MAX_TAGS } from '../src/config';
import { shareCards } from '../src/share/shareCard';
import { useConfirmIdShare } from '../src/share/useConfirmIdShare';
import { strings } from '../src/strings';
import { showError } from '../src/ui/errorAlert';
import { Button } from '../src/ui/Button';
import { TagSheet } from '../src/ui/TagSheet';
import { canReadText, readPhotoText } from '../src/analysis/readPhoto';
import { rereadCards } from '../src/cards/readBackfill';
import { AppearanceToggle } from '../src/ui/AppearanceToggle';
import { TagChips } from '../src/ui/TagChips';
import { ChipRow } from '../src/ui/ChipRow';
import { Fab } from '../src/ui/Fab';
import { TabBar, useTabBarClearance } from '../src/ui/TabBar';
import { PinnedPanels, DocumentRows, SectionHeading, metaLine } from '../src/ui/DocumentList';
import { UndoBar } from '../src/ui/UndoBar';
import { deleteAllWithUndo } from '../src/cards/deleteWithUndo';
import { IconButton } from '../src/ui/IconButton';
import { Card } from '../src/cards/types';
import { RetroIcon } from '../src/ui/RetroIcon';
import { Screen } from '../src/ui/Surface';
import { RADIUS, TRACKING, TYPE, useTheme } from '../src/ui/theme';
import { useTooltip } from '../src/ui/Tooltip';
import { LiveText } from '../src/ui/LiveText';
import { GestureTip, useGestureTips } from '../src/ui/GestureTip';
import { SortSheet } from '../src/ui/SortSheet';
import { DocumentVisit, listDocumentVisits } from '../src/showcase/documentVisits';
import { useShowcaseAdd } from '../src/showcase/ShowcaseActions';
import { formatActivityAgo } from '../src/time/dates';
import { useDebouncedQuery } from '../src/ui/useDebouncedQuery';

const isExpiryChoice = (value: unknown): value is 'on' | 'off' => value === 'on' || value === 'off';

export default function Documents() {
  const {
    cards,
    notes,
    folders,
    people = [],
    services,
    refresh,
    pdfBackfill,
    stopPdfBackfill,
    undo,
  } = useApp();
  const confirmIdShare = useConfirmIdShare();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ mode?: string; search?: string }>();
  const mode = params.mode === 'favorites' || params.mode === 'recent' ? params.mode : 'all';
  // Null until the visits have loaded, so the list never flashes its empty message first.
  const [visits, setVisits] = useState<DocumentVisit[] | null>(null);
  useFocusEffect(useCallback(() => {
    if (mode !== 'recent') return;
    let active = true;
    void listDocumentVisits(services.db).then((next) => { if (active) setVisits(next); }).catch(() => { if (active) setVisits([]); });
    return () => { active = false; };
  }, [mode, services]));
  const [query, setQuery] = useState('');
  const settledQuery = useDebouncedQuery(query);
  const searchPending = query.trim() !== settledQuery.trim();
  const [chosen, setChosen] = useState<string | null>(null);
  // Only tags some card has are offered; if the chosen tag's last card goes, fall back to All.
  const present = allTags(cards);
  const tag = (chosen && present.find((t) => sameTag(t, chosen))) || null;
  const [chosenPerson, setChosenPerson] = useState<string | null>(null);
  const personId = chosenPerson && people.some((person) => person.id === chosenPerson) ? chosenPerson : null;
  const byPerson = personId ? cards.filter((card) => card.personId === personId) : cards;
  const searchResults = useDocumentSearch(cards, folders, settledQuery);
  const shown = filterCards(searchResults, { query: '', tag }).filter((card) => !personId || card.personId === personId);
  const pinnedNotes = notes.filter((note) => note.pinned).map(({ id, title }) => ({ id, title }));
  const [sort, setSort] = useSavedChoice('gallerySort', isDocumentSort, 'name');
  const [expiringChoice, setExpiringChoice] = useSavedChoice('galleryExpiring', isExpiryChoice, 'off');
  const expiringOnly = expiringChoice === 'on';
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const now = new Date();
  const matchesExpiry = (card: Card) => !expiringOnly || isExpiringSoon(card, now);
  // Keep pinned shortcuts visible during search and tag filtering. Person and expiry
  // filters apply to both sections.
  const { pinned } = splitPinned(byPerson.filter(matchesExpiry));
  const rest = sortDocuments(shown.filter((card) => !card.pinned && matchesExpiry(card)), sort);
  // Favorites and Recently visited are narrower lists under the same search, filters and selection.
  // Favorites follow the chosen order; Recently visited always reads newest visit first.
  const visitedAt = new Map((visits ?? []).map((visit) => [visit.id, visit.visitedAt]));
  const modeCards = mode === 'favorites'
    ? sortDocuments(shown.filter((card) => card.pinned && matchesExpiry(card)), sort)
    : mode === 'recent'
      ? shown.filter((card) => visitedAt.has(card.id) && matchesExpiry(card)).sort((a, b) => visitedAt.get(b.id)! - visitedAt.get(a.id)!)
      : [];
  const listed = mode === 'all' ? [...pinned, ...rest] : modeCards;
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const selected = listed.filter((card) => selectedIds.has(card.id));
  const [choosingTags, setChoosingTags] = useState(false);
  const [rereading, setRereading] = useState<{ done: number; of: number } | null>(null);
  const selecting = selected.length > 0;
  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);
  // A selection belongs to the list it was made in.
  useEffect(() => clearSelection(), [mode, clearSelection]);
  const tips = useGestureTips(services.settings);
  const toggleSelected = (card: Card) => {
    tips.done('documents');
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(card.id)) next.delete(card.id);
      else next.add(card.id);
      return next;
    });
  };

  // Only the focused list can intercept Android Back.
  useFocusEffect(useCallback(() => {
    if (!selecting) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      clearSelection();
      return true;
    });
    return () => sub.remove();
  }, [selecting, clearSelection]));

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
      title: strings.home.shareIdsTitle,
      body: strings.home.shareIdsBody,
      go: () =>
        shareCards(services.store, picked).catch((e) => {
          console.warn('Share failed', e);
          showError('shareMany', e);
        }),
    });
  };

  const sortName = mode === 'recent' ? strings.home.sortRecent
    : sort === 'name' ? strings.home.sortName : sort === 'expiry' ? strings.home.sortExpiry : strings.home.sortAdded;

  const add = useShowcaseAdd();

  const clearance = useTabBarClearance();
  const listActions = {
    onOpen: (card: Card) => router.push(`/card/${card.id}`),
    onToggle: toggleSelected,
    selected: selectedIds,
    selecting,
  };

  return (
    <Screen style={{ paddingTop: insets.top + 8, paddingBottom: 0 }}>
      <View style={[styles.inset, styles.top]}>
        <View style={styles.header}>
          <View style={styles.titles}>
            <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
              {strings.home.title}
            </Text>
            <Text style={[styles.subtitle, { color: theme.muted }]}>{strings.home.subtitle}</Text>
          </View>
          <AppearanceToggle />
          <SettingsButton onPress={() => router.push('/settings')} />
        </View>
        {(cards.length > 0 || params.search === '1') && <SearchField value={query} onChange={setQuery} autoFocus={params.search === '1'} />}
        {pdfBackfill && (
          <View style={styles.backfill} testID="backfill-progress">
            <Text style={{ color: theme.muted, flex: 1 }}>{strings.home.backfillProgress(pdfBackfill.done, pdfBackfill.total)}</Text>
            <Button variant="secondary" label={strings.common.cancel} onPress={stopPdfBackfill} testID="backfill-cancel" />
          </View>
        )}
        {/* Filters sit directly under search, above whatever they filter. */}
        {cards.length > 0 && present.length > 0 && <TagChips tags={present} selected={tag ? [tag] : []} onPress={setChosen} includeAll />}
        {people.length > 0 && <ChipRow accessibilityLabel={strings.people.person} testID="person-filter"
          chips={[{ key: 'all', label: strings.people.everyone, selected: personId === null, onPress: () => setChosenPerson(null) },
            ...people.map((person) => ({ key: person.id, label: person.name, selected: personId === person.id,
              onPress: () => setChosenPerson(person.id), testID: `person-filter-${person.id}` }))]} />}
        {cards.length > 0 && (
          <Pressable
            onPress={() => setSortSheetOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={strings.home.sortChip(sortName)}
            accessibilityHint={`${strings.home.sortLabel}. ${strings.home.expiringSoon}: ${expiringOnly ? 'on' : 'off'}`}
            testID="sort-chip"
            style={[styles.sortChip, { backgroundColor: expiringOnly ? theme.bannerBg : theme.glass, borderColor: theme.rosette }]}
          >
            <Text style={{ color: theme.text, fontSize: TYPE.secondary, fontWeight: '700' }}>{strings.home.sortChip(sortName)}</Text>
          </Pressable>
        )}
      </View>

      {mode !== 'all' ? (
        <ScrollView
          style={styles.fill}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.inset, styles.library, { paddingBottom: selecting ? 16 : 84 }]}
          testID="document-list"
        >
          <View style={styles.section}>
            <SectionHeading
              title={mode === 'favorites' ? strings.home.favoritesTitle : strings.home.recentTitle}
              count={mode === 'recent' && visits === null ? undefined : strings.home.documentCount(modeCards.length)}
            />
            {!selecting && <Button variant="secondary" label={strings.home.showAll} onPress={() => router.replace('/documents')} />}
            {mode === 'recent' && visits === null ? (
              <LiveText style={[styles.promise, { color: theme.muted }]}>{strings.home.recentLoading}</LiveText>
            ) : modeCards.length > 0 ? (
              <DocumentRows
                cards={modeCards}
                {...listActions}
                meta={mode === 'recent'
                  ? (card, at) => `${strings.home.opened(formatActivityAgo(visitedAt.get(card.id)!, at.getTime()))}${strings.home.metaSeparator}${metaLine(card, at)}`
                  : undefined}
              />
            ) : (
              <LiveText style={[styles.promise, { color: theme.muted }]}>
                {searchPending ? strings.home.searching
                  : query.trim() || tag || personId ? strings.home.noResults
                  : expiringOnly && listedWithoutExpiry(mode, shown, visitedAt) ? strings.home.noneExpiring(EXPIRY_SOON_DAYS)
                  : mode === 'favorites' ? strings.home.favoritesEmpty : strings.home.recentEmpty}
              </LiveText>
            )}
          </View>
        </ScrollView>
      ) : cards.length === 0 && pinnedNotes.length === 0 ? (
        <View style={[styles.inset, styles.body]}>
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
        </View>
      ) : (
        <ScrollView
          style={styles.fill}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.inset, styles.library, { paddingBottom: selecting ? 16 : 84 }]}
          testID="document-list"
        >
          {!selecting && (pinned.length > 0 || rest.length > 0) && tips.showing('documents') && (
            <GestureTip
              text={strings.home.selectionTip}
              announce={!tips.announced('documents')}
              onAnnounced={() => tips.markAnnounced('documents')}
              onDismiss={() => tips.done('documents')}
              testID="documents-tip"
            />
          )}
          {(pinned.length > 0 || pinnedNotes.length > 0) && (
            <View style={styles.section} testID="pinned-section">
              <SectionHeading title={strings.home.pinnedForQuickAccess} icon="pin" />
              {pinned.length > 0 && <PinnedPanels cards={pinned} {...listActions} />}
              <PinnedNotes notes={pinnedNotes} onOpen={(id) => router.push(`/note-view/${id}`)} />
            </View>
          )}
          {cards.length > 0 && <View style={styles.section}>
            <SectionHeading title={strings.home.allDocuments} count={strings.home.documentCount(rest.length)} />
            {rest.length > 0 ? <DocumentRows cards={rest} {...listActions} /> : (
              <LiveText style={[styles.promise, { color: theme.muted }]}>
                {searchPending ? strings.home.searching : expiringOnly && pinned.length === 0 && shown.length > 0
                  ? strings.home.noneExpiring(EXPIRY_SOON_DAYS) : strings.home.noResults}
              </LiveText>
            )}
          </View>}
        </ScrollView>
      )}

      <SortSheet
        visible={sortSheetOpen}
        sort={sort}
        expiringOnly={expiringOnly}
        showOrder={mode !== 'recent'}
        onSort={setSort}
        onExpiringOnly={(on) => setExpiringChoice(on ? 'on' : 'off')}
        onClose={() => setSortSheetOpen(false)}
      />

      {selecting ? (
        <View style={[styles.selectionBar, { marginBottom: insets.bottom + 8, backgroundColor: theme.glassStrong, borderColor: theme.border }]} testID="selection-bar">
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
                hint={strings.recreate.selectionHint}
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
            existing={tagOptions([...cards, ...notes])}
            onApply={tagSelected}
            onClose={() => setChoosingTags(false)}
          />
        </View>
      ) : (
        <>
          {/* Floats just above the tab bar, beside the + button, while a removal can be undone. */}
          <View pointerEvents="box-none" style={[styles.undoDock, { bottom: clearance }]}>
            <UndoBar undo={undo} />
          </View>
          <Fab label="Add document or note" onPress={add.open} testID="add-card" />
          {add.sheet}
          <TabBar active="documents" />
        </>
      )}
    </Screen>
  );
}

// Whether the mode's list would have anything without the Expiring soon filter.
function listedWithoutExpiry(mode: 'favorites' | 'recent', shown: Card[], visitedAt: ReadonlyMap<string, number>): boolean {
  return shown.some((card) => (mode === 'favorites' ? card.pinned : visitedAt.has(card.id)));
}

// Pill search, as the style asks: a filled field two steps up, with a clear button once there's text.
function SearchField({ value, onChange, autoFocus }: { value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  const theme = useTheme();
  const stroke = { stroke: theme.muted, strokeWidth: 2, strokeLinecap: 'round' as const };
  const clear = useTooltip(strings.home.clearSearch);
  return (
    <View style={[styles.search, { backgroundColor: theme.glassStrong, borderColor: theme.border }]}>
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Circle cx={11} cy={11} r={7} {...stroke} />
        <Path d="M16.5 16.5L21 21" {...stroke} />
      </Svg>
      <TextInput autoFocus={autoFocus}
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

// Keep the existing SQLite keys so sort and expiry preferences survive an upgrade.
function useSavedChoice<T extends string>(key: 'gallerySort' | 'galleryExpiring', isValid: (v: unknown) => v is T, fallback: T) {
  const { services } = useApp();
  const [value, setValue] = useState<T>(fallback);
  useEffect(() => {
    let live = true;
    services.settings
      .get(key)
      .then((saved) => {
        if (!live) return;
        if (isValid(saved)) setValue(saved);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [services, key, isValid]);
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
  sortChip: { alignSelf: 'flex-start', minHeight: 48, paddingHorizontal: 16, justifyContent: 'center', borderWidth: 1, borderRadius: RADIUS.sm },
  fill: { flex: 1 },
  // Clear of the + button at the end (20 pt inset, 56 pt wide).
  undoDock: { position: 'absolute', start: 16, end: 88 },
  library: { paddingTop: 12, gap: 24 },
  section: { gap: 12 },
  backfill: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titles: { flex: 1 },
  subtitle: { fontSize: TYPE.secondary, marginTop: 2 },
  selectionBar: { marginHorizontal: 8, gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderRadius: RADIUS.lg },
  selectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectionActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  selectionButton: { width: '30%' },
  selectionCount: { flex: 1, fontSize: TYPE.secondary, fontWeight: '700' },
  selectionAction: { minWidth: 112 },
  inset: { paddingHorizontal: 16 },
  top: { gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  title: { fontSize: TYPE.title, fontWeight: '700', letterSpacing: TRACKING.tight },
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
  body: { flex: 1, justifyContent: 'center', paddingVertical: 12, gap: 16 },
  empty: { alignItems: 'center', gap: 12 },
  emptyIcon: { width: 124, height: 124, borderRadius: RADIUS.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: TYPE.title, fontWeight: '700', letterSpacing: TRACKING.tight, textAlign: 'center' },
  promise: { fontSize: TYPE.body, textAlign: 'center' },
});

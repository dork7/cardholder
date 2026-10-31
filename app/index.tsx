import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, BackHandler, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { FONT, Text } from '../src/ui/Text';
import { useApp } from '../src/app/AppProvider';
import { useLaunchLinks } from '../src/app/useLaunchLinks';
import { filterCards, splitPinned } from '../src/cards/listing';
import { CardCategory } from '../src/cards/types';
import { FOLDERS_ENABLED } from '../src/config';
import { canAddCard } from '../src/purchases/limits';
import { strings } from '../src/strings';
import { Button } from '../src/ui/Button';
import { CardGrid } from '../src/ui/CardGrid';
import { CardStack } from '../src/ui/CardStack';
import { AppearanceToggle } from '../src/ui/AppearanceToggle';
import { CategoryChips } from '../src/ui/CategoryChips';
import { ChipRow } from '../src/ui/ChipRow';
import { Fab } from '../src/ui/Fab';
import { Card } from '../src/cards/types';
import { PixelLogo } from '../src/ui/PixelLogo';
import { PinnedStrip } from '../src/ui/PinnedStrip';
import { Panel, Screen } from '../src/ui/Surface';
import { TYPE, useTheme } from '../src/ui/theme';
import { useTooltip } from '../src/ui/Tooltip';

// Panels settle in from just off their resting place; Reanimated skips this under Reduce Motion.
const ENTER = 360;

export default function Home() {
  const { cards, folders, categories, unlocked, openImportOnReady, clearOpenImport, homeFolders, services, refresh } = useApp();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  useLaunchLinks();
  const [query, setQuery] = useState('');
  const [chosen, setChosen] = useState<CardCategory | null>(null);
  // Only offer types the user actually has; if the chosen type's last card goes, fall back to All.
  const present = categories.filter((c) => cards.some((card) => card.category === c));
  const category = chosen && present.includes(chosen) ? chosen : null;
  const [chosenFolder, setChosenFolder] = useState<string | null>(null);
  // Falls back to all cards if the chosen folder is deleted, or the filter is hidden.
  const folderId =
    FOLDERS_ENABLED &&
    homeFolders.filter && chosenFolder && folders.some((f) => f.id === chosenFolder) ? chosenFolder : null;
  const folderChips = [
    ...(homeFolders.filter
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
      : []),
    ...(homeFolders.manage
      ? [{ key: 'manage', label: strings.folders.manage, onPress: () => router.push('/folders') }]
      : []),
  ];
  const shown = filterCards(cards, { query, category, folderId });
  const { pinned } = splitPinned(cards);
  const [gallery, setGallery] = useGalleryView();
  // Only cards still on screen count as selected, so a filter change can't delete something hidden.
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const selected = shown.filter((c) => selectedIds.has(c.id));
  const selecting = gallery && selected.length > 0;
  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);
  const toggleSelected = (card: Card) =>
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(card.id)) next.delete(card.id);
      else next.add(card.id);
      return next;
    });

  // The system back gesture leaves selection first, as in a photo gallery.
  useEffect(() => {
    if (!selecting) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      clearSelection();
      return true;
    });
    return () => sub.remove();
  }, [selecting, clearSelection]);

  const deleteSelected = () => {
    const doomed = selected;
    Alert.alert(strings.home.deleteSelectedTitle(doomed.length), strings.home.deleteSelectedBody(doomed.length), [
      { text: strings.common.cancel, style: 'cancel' },
      {
        text: strings.common.delete,
        style: 'destructive',
        onPress: async () => {
          let failed = false;
          for (const card of doomed) {
            try {
              await services.store.remove(card.id);
            } catch (e) {
              console.warn('Delete failed', e);
              failed = true;
            }
          }
          clearSelection();
          await refresh().catch((e) => console.warn('Refresh after delete failed', e));
          if (failed) Alert.alert(strings.common.error, strings.home.deleteSelectedFailed);
        },
      },
    ]);
  };

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
    <Screen style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }}>
      <Animated.View entering={FadeInDown.duration(ENTER)} style={[styles.inset, styles.top]}>
        <Panel style={styles.header} radius={24}>
          <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
            {strings.home.title}
          </Text>
          {/* Development builds only: opens the on-device AI test bench (app/dev/gemma.tsx). */}
          {__DEV__ && (
            <Pressable
              onPress={() => router.push('/dev/gemma')}
              accessibilityRole="button"
              hitSlop={8}
              style={({ pressed }) => [styles.devButton, { borderColor: theme.muted, opacity: pressed ? 0.7 : 1 }]}
              testID="open-ai-bench"
            >
              <Text style={[styles.devLabel, { color: theme.text }]}>Test AI</Text>
            </Pressable>
          )}
          <GalleryToggle
            on={gallery}
            onChange={(on) => {
              clearSelection();
              setGallery(on);
            }}
          />
          <AppearanceToggle />
          <SettingsButton onPress={() => router.push('/settings')} />
        </Panel>
        {cards.length > 1 && <SearchField value={query} onChange={setQuery} />}
        {/* Pinned cards stay put while searching or filtering: they're the shortcut, the stack is the browse. */}
        <PinnedStrip cards={pinned} onOpen={(card) => router.push(`/card/${card.id}`)} />
      </Animated.View>

      {/* The stack and filter sit centred; the add button floats in the thumb zone below them. */}
      <View style={[styles.inset, styles.body]}>
        {cards.length === 0 ? (
          <View style={styles.empty} testID="empty-state">
            <PixelLogo size={160} theme={theme} />
            <Text style={[styles.emptyTitle, { color: theme.text }]} accessibilityRole="header">
              {strings.home.emptyTitle}
            </Text>
            <Text style={[styles.promise, { color: theme.muted }]}>{strings.promise}</Text>
          </View>
        ) : (
          <>
            {shown.length === 0 ? (
              <Text style={[styles.promise, { color: theme.muted }]} accessibilityLiveRegion="polite">
                {strings.home.noResults}
              </Text>
            ) : gallery ? (
              <CardGrid
                cards={shown}
                selected={selectedIds}
                onOpen={(card) => router.push(`/card/${card.id}`)}
                onToggle={toggleSelected}
              />
            ) : (
              // Keyed by filter so the stack starts from its first card instead of carrying motion over.
              <CardStack
                key={`${category ?? 'all'}|${folderId ?? 'all'}|${query.trim().toLowerCase()}`}
                cards={shown}
                onOpen={(card) => router.push(`/card/${card.id}`)}
              />
            )}
            {/* Which parts of the folder row show is chosen in settings. */}
            {FOLDERS_ENABLED && folders.length > 0 && folderChips.length > 0 && (
              <ChipRow accessibilityLabel={strings.folders.title} chips={folderChips} />
            )}
            {/* With a single type, "All" and that type show the same cards, so there's nothing to filter. */}
            {present.length > 1 && (
              <CategoryChips value={category} onChange={setChosen} includeAll categories={present} />
            )}
          </>
        )}
      </View>

      {selecting ? (
        <View style={[styles.selectionBar, { paddingBottom: insets.bottom + 8, backgroundColor: theme.bg }]} testID="selection-bar">
          <Text style={[styles.selectionCount, { color: theme.text }]} accessibilityLiveRegion="polite">
            {strings.home.selected(selected.length)}
          </Text>
          <View style={styles.selectionAction}>
            <Button variant="secondary" label={strings.common.cancel} onPress={clearSelection} testID="selection-cancel" />
          </View>
          <View style={styles.selectionAction}>
            <Button variant="danger" label={strings.home.deleteSelected} onPress={deleteSelected} testID="selection-delete" />
          </View>
        </View>
      ) : (
        <Fab label={strings.home.addCard} onPress={addCard} testID="add-card" />
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
    <View style={[styles.search, { backgroundColor: theme.bannerBg, borderColor: theme.rosette }]}>
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
  const stroke = { stroke: theme.text, strokeWidth: 2, strokeLinecap: 'round' as const };
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
      style={({ pressed }) => [styles.round, { borderColor: theme.border, opacity: pressed ? 0.6 : 1 }]}
    >
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Path d="M4 7h9M17 7h3M4 17h3M11 17h9" {...stroke} />
        <Circle cx={15} cy={7} r={2} {...stroke} />
        <Circle cx={9} cy={17} r={2} {...stroke} />
      </Svg>
      {tooltip}
    </Pressable>
  );
}

// Switches the home screen between the card stack and the gallery grid. Lit while the gallery shows.
function GalleryToggle({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  const theme = useTheme();
  const color = on ? theme.onAccent : theme.text;
  const { ref, onLongPress, tooltip } = useTooltip(strings.home.galleryView);
  return (
    <Pressable
      ref={ref}
      onPress={() => onChange(!on)}
      onLongPress={onLongPress}
      hitSlop={8}
      accessibilityRole="switch"
      accessibilityLabel={strings.home.galleryView}
      accessibilityHint={strings.home.galleryViewHint}
      accessibilityState={{ checked: on }}
      testID="gallery-toggle"
      style={({ pressed }) => [
        styles.round,
        { borderColor: on ? theme.accent : theme.border, backgroundColor: on ? theme.accent : 'transparent', opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        {[
          [4, 4],
          [13, 4],
          [4, 13],
          [13, 13],
        ].map(([x, y]) => (
          <Rect key={`${x}-${y}`} x={x} y={y} width={7} height={7} rx={1.5} stroke={color} strokeWidth={2} />
        ))}
      </Svg>
      {tooltip}
    </Pressable>
  );
}

// The chosen home view, kept in settings so the app opens the way it was left.
function useGalleryView(): [boolean, (on: boolean) => void] {
  const { services } = useApp();
  const [gallery, setGallery] = useState(false);
  useEffect(() => {
    let live = true;
    services.settings
      .get('homeView')
      .then((value) => live && setGallery(value === 'gallery'))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [services]);
  const change = useCallback(
    (on: boolean) => {
      setGallery(on);
      services.settings.set('homeView', on ? 'gallery' : 'stack').catch((e) => console.warn('Saving the home view failed', e));
    },
    [services],
  );
  return [gallery, change];
}

const styles = StyleSheet.create({
  selectionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  selectionCount: { flex: 1, fontSize: TYPE.secondary, fontWeight: '700' },
  selectionAction: { minWidth: 112 },
  inset: { paddingHorizontal: 16 },
  top: { gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 20, paddingRight: 10, paddingVertical: 8 },
  devButton: { minHeight: 40, paddingHorizontal: 16, borderWidth: 1, borderRadius: 9999, justifyContent: 'center' },
  devLabel: { fontSize: TYPE.caption, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase' },
  title: { flex: 1, fontSize: TYPE.title, fontWeight: '700' },
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    borderRadius: 9999,
    borderWidth: 1,
  },
  searchInput: { flex: 1, minHeight: 48, fontSize: TYPE.body, fontFamily: FONT.regular },
  clear: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, justifyContent: 'center', paddingVertical: 24, gap: 24 },
  empty: { alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: TYPE.title, fontWeight: '700', textAlign: 'center' },
  promise: { fontSize: TYPE.body, textAlign: 'center' },
});

import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { FONT, Text } from '../src/ui/Text';
import { useApp } from '../src/app/AppProvider';
import { useLaunchLinks } from '../src/app/useLaunchLinks';
import { useBackupNudge } from '../src/backup/useBackupNudge';
import { filterCards, splitPinned } from '../src/cards/listing';
import { CATEGORIES, Category } from '../src/cards/types';
import { canAddCard } from '../src/purchases/limits';
import { strings } from '../src/strings';
import { BackupBanner } from '../src/ui/BackupBanner';
import { CardStack } from '../src/ui/CardStack';
import { AppearanceToggle } from '../src/ui/AppearanceToggle';
import { CategoryChips } from '../src/ui/CategoryChips';
import { ChipRow } from '../src/ui/ChipRow';
import { Fab } from '../src/ui/Fab';
import { Rosette } from '../src/ui/Rosette';
import { PinnedStrip } from '../src/ui/PinnedStrip';
import { Panel, Screen } from '../src/ui/Surface';
import { TYPE, useTheme } from '../src/ui/theme';

// Panels settle in from just off their resting place; Reanimated skips this under Reduce Motion.
const ENTER = 360;

export default function Home() {
  const { cards, folders, unlocked, openImportOnReady, clearOpenImport } = useApp();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const nudge = useBackupNudge();
  useLaunchLinks();
  const [query, setQuery] = useState('');
  const [chosen, setChosen] = useState<Category | null>(null);
  // Only offer types the user actually has; if the chosen type's last card goes, fall back to All.
  const present = CATEGORIES.filter((c) => cards.some((card) => card.category === c));
  const category = chosen && present.includes(chosen) ? chosen : null;
  const [chosenFolder, setChosenFolder] = useState<string | null>(null);
  // Falls back to all cards if the chosen folder is deleted.
  const folderId = chosenFolder && folders.some((f) => f.id === chosenFolder) ? chosenFolder : null;
  const shown = filterCards(cards, { query, category, folderId });
  const { pinned } = splitPinned(cards);

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
          <AppearanceToggle />
          <SettingsButton onPress={() => router.push('/settings')} />
        </Panel>
        {nudge.visible && <BackupBanner onBackup={() => router.push('/export')} onDismiss={nudge.snooze} />}
        {cards.length > 1 && <SearchField value={query} onChange={setQuery} />}
        {/* Pinned cards stay put while searching or filtering: they're the shortcut, the stack is the browse. */}
        <PinnedStrip cards={pinned} onOpen={(card) => router.push(`/card/${card.id}`)} />
      </Animated.View>

      {/* The stack and filter sit centred; the add button floats in the thumb zone below them. */}
      <View style={[styles.inset, styles.body]}>
        {cards.length === 0 ? (
          <View style={styles.empty} testID="empty-state">
            <Rosette size={200} color={theme.rosette} />
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
            ) : (
              // Keyed by filter so the stack starts from its first card instead of carrying motion over.
              <CardStack
                key={`${category ?? 'all'}|${folderId ?? 'all'}|${query.trim().toLowerCase()}`}
                cards={shown}
                onOpen={(card) => router.push(`/card/${card.id}`)}
              />
            )}
            {folders.length > 0 && (
              <ChipRow
                accessibilityLabel={strings.folders.title}
                chips={[
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
                  { key: 'manage', label: strings.folders.manage, onPress: () => router.push('/folders') },
                ]}
              />
            )}
            {/* With a single type, "All" and that type show the same cards, so there's nothing to filter. */}
            {present.length > 1 && (
              <CategoryChips value={category} onChange={setChosen} includeAll categories={present} />
            )}
          </>
        )}
      </View>

      <Fab label={strings.home.addCard} onPress={addCard} testID="add-card" />
    </Screen>
  );
}

// Pill search, as the style asks: a filled field two steps up, with a clear button once there's text.
function SearchField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const theme = useTheme();
  const stroke = { stroke: theme.muted, strokeWidth: 2, strokeLinecap: 'round' as const };
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
          onPress={() => onChange('')}
          accessibilityRole="button"
          accessibilityLabel={strings.home.clearSearch}
          hitSlop={8}
          style={styles.clear}
        >
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path d="M6 6l12 12M18 6L6 18" {...stroke} stroke={theme.text} />
          </Svg>
        </Pressable>
      )}
    </View>
  );
}

function SettingsButton({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  const stroke = { stroke: theme.text, strokeWidth: 2, strokeLinecap: 'round' as const };
  return (
    <Pressable
      onPress={onPress}
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
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

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../src/ui/Text';
import { useApp } from '../src/app/AppProvider';
import { filterCards } from '../src/cards/listing';
import { CATEGORIES, Category } from '../src/cards/types';
import { strings } from '../src/strings';
import { CardStack } from '../src/ui/CardStack';
import { AppearanceToggle } from '../src/ui/AppearanceToggle';
import { CategoryChips } from '../src/ui/CategoryChips';
import { Fab } from '../src/ui/Fab';
import { Panel, Screen } from '../src/ui/Surface';
import { TYPE, useTheme } from '../src/ui/theme';

// Panels settle in from just off their resting place; Reanimated skips this under Reduce Motion.
const ENTER = 360;

export default function Home() {
  const { cards } = useApp();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [chosen, setChosen] = useState<Category | null>(null);
  // Only offer types the user actually has; if the chosen type's last card goes, fall back to All.
  const present = CATEGORIES.filter((c) => cards.some((card) => card.category === c));
  const category = chosen && present.includes(chosen) ? chosen : null;
  const shown = filterCards(cards, { query: '', category });
  // A plain View: the screen fits without scrolling, so nothing competes with the stack for swipes.
  return (
    <Screen style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }}>
      <Animated.View entering={FadeInDown.duration(ENTER)} style={styles.inset}>
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
        </Panel>
      </Animated.View>

      {/* The stack and filter sit centred; the add button floats in the thumb zone below them. */}
      <View style={[styles.inset, styles.body]}>
        {cards.length === 0 ? (
          <Panel style={styles.empty} testID="empty-state">
            <Text style={[styles.emptyTitle, { color: theme.text }]} accessibilityRole="header">
              {strings.home.emptyTitle}
            </Text>
            <Text style={{ fontSize: TYPE.body, color: theme.muted }}>{strings.promise}</Text>
          </Panel>
        ) : (
          <>
            {/* Keyed by filter so the stack starts from its first card instead of carrying motion over. */}
            <CardStack key={category ?? 'all'} cards={shown} onOpen={(card) => router.push(`/card/${card.id}`)} />
            {/* With a single type, "All" and that type show the same cards, so there's nothing to filter. */}
            {present.length > 1 && (
              <CategoryChips value={category} onChange={setChosen} includeAll categories={present} />
            )}
          </>
        )}
      </View>

      <Fab label={strings.home.addCard} onPress={() => router.push('/edit/new')} testID="add-card" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  inset: { paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 20, paddingRight: 10, paddingVertical: 8 },
  devButton: { minHeight: 40, paddingHorizontal: 16, borderWidth: 1, borderRadius: 9999, justifyContent: 'center' },
  devLabel: { fontSize: TYPE.caption, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase' },
  title: { flex: 1, fontSize: TYPE.title, fontWeight: '700' },
  body: { flex: 1, justifyContent: 'center', paddingVertical: 24, gap: 24 },
  empty: { padding: 20, gap: 8 },
  emptyTitle: { fontSize: TYPE.title, fontWeight: '700' },
});

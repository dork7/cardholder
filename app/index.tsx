import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../src/ui/Text';
import { useApp } from '../src/app/AppProvider';
import { filterCards } from '../src/cards/listing';
import { CATEGORIES, Category } from '../src/cards/types';
import { strings } from '../src/strings';
import { CardStack } from '../src/ui/CardStack';
import { CategoryChips } from '../src/ui/CategoryChips';
import { Fab } from '../src/ui/Fab';
import { GlassPanel, GlassScene } from '../src/ui/Glass';
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
    <GlassScene style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }}>
      <Animated.View entering={FadeInDown.duration(ENTER)} style={styles.inset}>
        <GlassPanel style={styles.header} radius={24}>
          <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
            {strings.home.title}
          </Text>
        </GlassPanel>
      </Animated.View>

      {/* The stack and filter sit centred; the add button floats in the thumb zone below them. */}
      <View style={[styles.inset, styles.body]}>
        {cards.length === 0 ? (
          <GlassPanel style={styles.empty} testID="empty-state">
            <Text style={[styles.emptyTitle, { color: theme.text }]} accessibilityRole="header">
              {strings.home.emptyTitle}
            </Text>
            <Text style={{ fontSize: TYPE.body, color: theme.muted }}>{strings.promise}</Text>
          </GlassPanel>
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
    </GlassScene>
  );
}

const styles = StyleSheet.create({
  inset: { paddingHorizontal: 16 },
  header: { paddingHorizontal: 20, paddingVertical: 12 },
  title: { fontSize: TYPE.title, fontWeight: '700' },
  body: { flex: 1, justifyContent: 'center', paddingVertical: 24, gap: 24 },
  empty: { padding: 20, gap: 8 },
  emptyTitle: { fontSize: TYPE.title, fontWeight: '700' },
});

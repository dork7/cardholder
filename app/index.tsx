import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../src/ui/Text';
import { useApp } from '../src/app/AppProvider';
import { filterCards } from '../src/cards/listing';
import { CATEGORIES, Category } from '../src/cards/types';
import { strings } from '../src/strings';
import { Button } from '../src/ui/Button';
import { CardStack } from '../src/ui/CardStack';
import { CategoryChips } from '../src/ui/CategoryChips';
import { useTheme } from '../src/ui/theme';

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
    <View style={{ flex: 1, backgroundColor: theme.bg, padding: 16, paddingBottom: 16 + insets.bottom, gap: 24 }}>
      {cards.length === 0 ? (
        <>
          <Text style={{ fontSize: 24, fontWeight: '700', color: theme.text }} accessibilityRole="header">
            {strings.home.emptyTitle}
          </Text>
          <Text style={{ fontSize: 18, color: theme.muted }}>{strings.promise}</Text>
        </>
      ) : (
        <>
          {/* Stack, filter and add button all sit low, within thumb reach. */}
          <View style={{ flex: 1 }} />
          {/* Keyed by filter so the stack starts from its first card instead of carrying motion over. */}
          <CardStack key={category ?? 'all'} cards={shown} onOpen={(card) => router.push(`/card/${card.id}`)} />
          {/* With a single type, "All" and that type show the same cards, so there's nothing to filter. */}
          {present.length > 1 && (
            <CategoryChips value={category} onChange={setChosen} includeAll categories={present} />
          )}
        </>
      )}
      {cards.length === 0 && <View style={{ flex: 1 }} />}
      <Button label={strings.home.addCard} onPress={() => router.push('/edit/new')} testID="add-card" />
    </View>
  );
}

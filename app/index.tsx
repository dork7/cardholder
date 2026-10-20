import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { Text } from '../src/ui/Text';
import { useApp } from '../src/app/AppProvider';
import { strings } from '../src/strings';
import { Button } from '../src/ui/Button';
import { CardStack } from '../src/ui/CardStack';
import { useTheme } from '../src/ui/theme';

export default function Home() {
  const { cards } = useApp();
  const router = useRouter();
  const theme = useTheme();
  // A plain View: the screen fits without scrolling, so nothing competes with the stack for swipes.
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, padding: 16, gap: 24 }}>
      {cards.length === 0 ? (
        <>
          <Text style={{ fontSize: 24, fontWeight: '700', color: theme.text }} accessibilityRole="header">
            {strings.home.emptyTitle}
          </Text>
          <Text style={{ fontSize: 18, color: theme.muted }}>{strings.promise}</Text>
        </>
      ) : (
        <CardStack cards={cards} onOpen={(card) => router.push(`/card/${card.id}`)} />
      )}
      <Button label={strings.home.addCard} onPress={() => router.push('/edit/new')} testID="add-card" />
    </View>
  );
}

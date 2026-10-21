import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { Text } from '../src/ui/Text';
import { useApp } from '../src/app/AppProvider';
import { strings } from '../src/strings';
import { CardStack } from '../src/ui/CardStack';
import { Fab } from '../src/ui/Fab';
import { useTheme } from '../src/ui/theme';

export default function Home() {
  const { cards } = useApp();
  const router = useRouter();
  const theme = useTheme();
  // A plain View: the screen fits without scrolling, so nothing competes with the stack for swipes.
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      {cards.length === 0 ? (
        <View style={{ padding: 16, gap: 24 }}>
          <Text style={{ fontSize: 24, fontWeight: '700', color: theme.text }} accessibilityRole="header">
            {strings.home.emptyTitle}
          </Text>
          <Text style={{ fontSize: 18, color: theme.muted }}>{strings.promise}</Text>
        </View>
      ) : (
        <View style={{ flex: 1, padding: 16, justifyContent: 'center' }}>
          <CardStack cards={cards} onOpen={(card) => router.push(`/card/${card.id}`)} />
        </View>
      )}
      <Fab label={strings.home.addCard} onPress={() => router.push('/edit/new')} testID="add-card" />
    </View>
  );
}

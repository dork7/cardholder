import { useRouter } from 'expo-router';
import { ScrollView } from 'react-native';
import { Text } from '../src/ui/Text';
import { useApp } from '../src/app/AppProvider';
import { strings } from '../src/strings';
import { Button } from '../src/ui/Button';
import { useTheme } from '../src/ui/theme';

export default function Home() {
  const { cards } = useApp();
  const router = useRouter();
  const theme = useTheme();
  return (
    <ScrollView style={{ backgroundColor: theme.bg }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      {cards.length === 0 && (
        <>
          <Text style={{ fontSize: 24, fontWeight: '700', color: theme.text }} accessibilityRole="header">
            {strings.home.emptyTitle}
          </Text>
          <Text style={{ fontSize: 18, color: theme.muted }}>{strings.promise}</Text>
        </>
      )}
      {cards.map((card) => (
        <Button key={card.id} variant="secondary" label={card.name} onPress={() => router.push(`/card/${card.id}`)} />
      ))}
      <Button label={strings.home.addCard} onPress={() => router.push('/edit/new')} testID="add-card" />
    </ScrollView>
  );
}

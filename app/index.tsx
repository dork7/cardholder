import { useRouter } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../src/ui/Text';
import { useApp } from '../src/app/AppProvider';
import { strings } from '../src/strings';
import { Button } from '../src/ui/Button';
import { Card } from '../src/cards/types';
import { CardStack } from '../src/ui/CardStack';
import { GlassPanel, GlassScene } from '../src/ui/Glass';
import { TYPE, useTheme } from '../src/ui/theme';

// Panels settle in from just off their resting place; Reanimated skips this under Reduce Motion.
const ENTER = 360;

export default function Home() {
  const { services, cards, refresh } = useApp();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const togglePin = async (card: Card) => {
    try {
      await services.store.setPinned(card.id, !card.pinned);
      await refresh();
    } catch {
      Alert.alert(strings.common.error);
    }
  };
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

      <View style={[styles.inset, styles.body]}>
        {cards.length === 0 ? (
          <GlassPanel style={styles.empty} testID="empty-state">
            <Text style={[styles.emptyTitle, { color: theme.text }]} accessibilityRole="header">
              {strings.home.emptyTitle}
            </Text>
            <Text style={{ fontSize: TYPE.body, color: theme.muted }}>{strings.promise}</Text>
          </GlassPanel>
        ) : (
          <CardStack cards={cards} onOpen={(card) => router.push(`/card/${card.id}`)} onPin={togglePin} />
        )}
      </View>

      <Animated.View entering={FadeInUp.duration(ENTER)} style={styles.inset}>
        <GlassPanel style={styles.bar} radius={28}>
          <Button label={strings.home.addCard} onPress={() => router.push('/edit/new')} testID="add-card" />
        </GlassPanel>
      </Animated.View>
    </GlassScene>
  );
}

const styles = StyleSheet.create({
  inset: { paddingHorizontal: 16 },
  header: { paddingHorizontal: 20, paddingVertical: 12 },
  title: { fontSize: TYPE.title, fontWeight: '700' },
  body: { flex: 1, justifyContent: 'center', paddingVertical: 24 },
  empty: { padding: 20, gap: 8 },
  emptyTitle: { fontSize: TYPE.title, fontWeight: '700' },
  bar: { padding: 8 },
});

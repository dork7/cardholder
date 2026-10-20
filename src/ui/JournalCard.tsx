import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import { Card } from '../cards/types';
import { useCardImage } from '../hooks/useCardImage';
import { strings } from '../strings';
import { Text } from './Text';
import { TYPE, useTheme } from './theme';

interface Props {
  card: Card;
  depth: number; // 0 is the front card; cards behind only show their top strip
  onPin?: (card: Card) => void;
}

export function JournalCard({ card, depth, onPin }: Props) {
  const theme = useTheme();
  const front = depth === 0;
  // Cards behind never load their photos: only their name shows above the front card.
  const thumbUri = useCardImage(front ? card : undefined, 'thumb');
  const heroUri = useCardImage(front ? card : undefined, 'front');

  const shell = [styles.card, { backgroundColor: front ? theme.card : theme.cardBack, borderColor: theme.glassEdge }];

  if (!front) {
    return (
      <View style={[shell, styles.strip]}>
        <Text style={[styles.stripName, { color: theme.muted }]} numberOfLines={1}>
          {card.name}
        </Text>
      </View>
    );
  }

  return (
    <View style={shell}>
      <View style={styles.headerRow}>
        <View style={[styles.avatar, { backgroundColor: theme.cardBack }]}>
          {thumbUri && <Image source={{ uri: thumbUri }} style={StyleSheet.absoluteFill} contentFit="cover" />}
        </View>
        <View style={styles.titleBlock}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {card.name}
          </Text>
          <Text style={[styles.category, { color: theme.muted }]}>{strings.categories[card.category]}</Text>
        </View>
        {onPin && (
          <Pressable
            onPress={() => onPin(card)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={card.pinned ? strings.card.unpin : strings.card.pin}
            accessibilityState={{ selected: card.pinned }}
            style={({ pressed }) => [
              styles.pin,
              { backgroundColor: theme.cardBack, borderColor: theme.glassEdge, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons name={card.pinned ? 'pin' : 'pin-outline'} size={18} color={card.pinned ? theme.accent : theme.text} />
          </Pressable>
        )}
      </View>

      <View style={[styles.hero, { backgroundColor: theme.cardBack }]}>
        {heroUri && <Image source={{ uri: heroUri }} style={StyleSheet.absoluteFill} contentFit="contain" />}
      </View>

      {card.notes ? (
        <Text style={[styles.notes, { color: theme.muted }]} numberOfLines={2}>
          {card.notes}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    padding: 16,
    gap: 14,
  },
  strip: { paddingTop: 0 },
  stripName: { fontSize: TYPE.caption, fontWeight: '600', lineHeight: 22 }, // fits the PEEK strip in CardStack
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 12, overflow: 'hidden' },
  titleBlock: { flex: 1 },
  title: { fontSize: TYPE.section, fontWeight: '700' },
  category: { fontSize: TYPE.secondary },
  pin: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: { flex: 1, borderRadius: 20, overflow: 'hidden' },
  notes: { fontSize: TYPE.secondary },
});

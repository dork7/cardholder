import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { displayName } from '../cards/display';
import { expiryLabel, expiryStatus } from '../cards/expiry';
import { Card } from '../cards/types';
import { useCardImage } from '../hooks/useCardImage';
import { strings } from '../strings';
import { Text } from './Text';
import { TYPE, useTheme } from './theme';

interface Props {
  cards: Card[]; // pinned only, in pinned order
  onOpen: (card: Card) => void;
}

// The pinned cards, one tap away above the stack. A pinned card close to expiry says so here, so the
// cards that matter most never lapse unseen.
export function PinnedStrip({ cards, onOpen }: Props) {
  const theme = useTheme();
  if (cards.length === 0) return null;
  const now = new Date();
  return (
    <View style={styles.section} testID="pinned-strip">
      <Text style={[styles.heading, { color: theme.muted }]} accessibilityRole="header">
        {strings.home.pinned}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroller} contentContainerStyle={styles.row}>
        {cards.map((card) => (
          <PinnedTile key={card.id} card={card} now={now} onPress={() => onOpen(card)} />
        ))}
      </ScrollView>
    </View>
  );
}

function PinnedTile({ card, now, onPress }: { card: Card; now: Date; onPress: () => void }) {
  const theme = useTheme();
  const uri = useCardImage(card, 'thumb');
  const status = expiryStatus(card, now).kind;
  const warn = status === 'expired' || status === 'today' || status === 'soon';
  const name = displayName(card);
  const note = warn ? expiryLabel(card, now) : null;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={note ? `${strings.home.openCard(name)}, ${note}` : strings.home.openCard(name)}
      testID={`pinned-${card.id}`}
      style={({ pressed }) => [styles.tile, { backgroundColor: theme.bannerBg, opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={[styles.thumb, { backgroundColor: theme.surface }]}>
        {uri && <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.photoDim }]} />
      </View>
      <View style={styles.label}>
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
          {name}
        </Text>
        {note && (
          <Text style={[styles.note, { color: status === 'expired' ? theme.danger : theme.muted }]} numberOfLines={1}>
            {note}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  heading: { fontSize: TYPE.caption, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', paddingLeft: 4 },
  // A horizontal ScrollView otherwise grows to fill a column.
  scroller: { flexGrow: 0 },
  row: { gap: 8 },
  tile: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, padding: 6, paddingRight: 16, borderRadius: 9999, maxWidth: 240 },
  // ID-1 proportions, rounded to match the pill it sits in.
  thumb: { width: 64, height: 40, borderRadius: 20, overflow: 'hidden' },
  label: { flexShrink: 1 },
  name: { fontSize: TYPE.secondary, fontWeight: '700' },
  note: { fontSize: TYPE.caption },
});

import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { displayName } from '../cards/display';
import { expiryLabel, expiryStatus, needsExpiryAlert } from '../cards/expiry';
import { Card } from '../cards/types';
import { useCardImage } from '../hooks/useCardImage';
import { strings } from '../strings';
import { ExpiryAlert } from './ExpiryAlert';
import { Text } from './Text';
import { RADIUS, TRACKING, TYPE, useTheme } from './theme';
import { CardPicture } from './CardPicture';

interface Props {
  cards: Card[]; // pinned only, in pinned order
  onOpen: (card: Card) => void;
}

// The pinned cards, one tap away above the gallery. A pinned card close to expiry says so here, so the
// cards that matter most never lapse unseen.
export function PinnedStrip({ cards, onOpen }: Props) {
  const theme = useTheme();
  if (cards.length === 0) return null;
  const now = new Date();
  return (
    <View style={styles.section} testID="pinned-strip">
      <Text style={[styles.heading, { color: theme.text }]} accessibilityRole="header">
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
      style={({ pressed }) => [styles.tile, { backgroundColor: theme.glassStrong, borderColor: theme.border, opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={[styles.thumb, { backgroundColor: theme.bg }]}>
        {uri && <CardPicture uri={uri} vertical={card.vertical} blurPreview={card.blurPreview} />}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.photoDim }]} />
        {needsExpiryAlert(card, now) && (
          <View style={styles.alert}>
            <ExpiryAlert size={18} testID={`expiry-alert-${card.id}`} />
          </View>
        )}
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
  // A plain section title keeps the document names prominent.
  heading: { fontSize: TYPE.section, fontWeight: '700', letterSpacing: TRACKING.tight },
  // A horizontal ScrollView otherwise grows to fill a column.
  scroller: { flexGrow: 0 },
  row: { gap: 10 },
  tile: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 62, padding: 8, paddingRight: 16, borderRadius: RADIUS.md, borderWidth: 1, maxWidth: 260 },
  // ID-1 proportions with the real card's corner (3.7% of 64 pt).
  thumb: { width: 64, height: 40, borderRadius: 2.4, overflow: 'hidden' },
  alert: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  label: { flexShrink: 1 },
  name: { fontSize: TYPE.secondary, fontWeight: '700' },
  note: { fontSize: TYPE.caption },
});

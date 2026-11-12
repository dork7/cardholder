import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { displayName } from '../cards/display';
import { expiryLabel, needsExpiryAlert } from '../cards/expiry';
import { Card } from '../cards/types';
import { useCardImage } from '../hooks/useCardImage';
import { strings } from '../strings';
import { ExpiryAlert } from './ExpiryAlert';
import { Text } from './Text';
import { TYPE, useTheme } from './theme';
import { CardPicture } from './CardPicture';

interface Props {
  cards: Card[];
  selected: ReadonlySet<string>;
  onOpen: (card: Card) => void;
  // Called on a long-press, and on any tap once something is selected.
  onToggle: (card: Card) => void;
}

// The gallery: every card at once, two to a row. A long-press starts selecting; while anything is
// selected a tap adds or removes a card instead of opening it.
export function CardGrid({ cards, selected, onOpen, onToggle }: Props) {
  const selecting = selected.size > 0;
  // An empty slot after an odd last card keeps it the same width as the rest.
  const slots: (Card | null)[] = cards.length % 2 ? [...cards, null] : cards;
  return (
    <FlatList
      data={slots}
      keyExtractor={(card) => card?.id ?? 'spacer'}
      numColumns={2}
      style={styles.list}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.content}
      extraData={selected}
      testID="card-grid"
      renderItem={({ item }) =>
        item === null ? (
          <View style={styles.tile} />
        ) : (
          <GridTile
            card={item}
            checked={selected.has(item.id)}
            selecting={selecting}
            onPress={() => (selecting ? onToggle(item) : onOpen(item))}
            onLongPress={() => onToggle(item)}
          />
        )
      }
    />
  );
}

interface TileProps {
  card: Card;
  checked: boolean;
  selecting: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

function GridTile({ card, checked, selecting, onPress, onLongPress }: TileProps) {
  const theme = useTheme();
  const uri = useCardImage(card, 'thumb');
  const name = displayName(card);
  const now = new Date();
  const alert = needsExpiryAlert(card, now);
  const label = selecting ? name : strings.home.openCard(name);
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole={selecting ? 'checkbox' : 'button'}
      accessibilityLabel={alert ? `${label}, ${expiryLabel(card, now)}` : label}
      accessibilityState={selecting ? { checked } : undefined}
      accessibilityHint={selecting ? undefined : strings.home.selectHint}
      // A screen reader can start selecting from the actions menu, as a long-press does.
      accessibilityActions={selecting ? undefined : [{ name: 'select', label: strings.home.selectAction }]}
      onAccessibilityAction={(e) => e.nativeEvent.actionName === 'select' && onLongPress()}
      testID={`grid-${card.id}`}
      style={({ pressed }) => [styles.tile, { opacity: pressed ? 0.7 : 1 }]}
    >
      <View
        style={[
          styles.picture,
          {
            backgroundColor: theme.bg,
            borderColor: checked ? theme.accent : 'transparent',
          },
        ]}
      >
        <CardPicture uri={uri} vertical={card.vertical} blurPreview={card.blurPreview} radius={PICTURE_INNER_RADIUS} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.photoDim, borderRadius: PICTURE_INNER_RADIUS }]} />
        {alert && (
          <View style={styles.alert}>
            <ExpiryAlert size={22} testID={`expiry-alert-${card.id}`} />
          </View>
        )}
        {selecting && (
          <View
            style={[
              styles.check,
              checked
                ? { backgroundColor: theme.accent, borderColor: theme.accent }
                : {
                    backgroundColor: 'rgba(0, 0, 0, 0.35)',
                    borderColor: '#FFFFFF',
                  },
            ]}
          >
            {checked && (
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M5 12.5l4.5 4.5L19 7.5"
                  stroke={theme.onAccent}
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            )}
          </View>
        )}
      </View>
      <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
        {name}
      </Text>
      <Text style={[styles.tags, { color: theme.muted }]} numberOfLines={1}>
        {card.tags.join(' · ')}
      </Text>
    </Pressable>
  );
}

// The picture sits inside the tile's 3 pt selection border, so its corners are that much tighter.
const PICTURE_INNER_RADIUS = 13;

const styles = StyleSheet.create({
  list: { flex: 1, alignSelf: 'stretch' },
  content: { gap: 16, paddingBottom: 96 }, // clear of the add button
  row: { gap: 12 },
  tile: { flex: 1, gap: 2 },
  // ID-1 proportions, like the cards in the stack.
  picture: {
    aspectRatio: 1.585,
    borderRadius: 16,
    borderWidth: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  alert: { position: 'absolute', top: 6, left: 6 },
  check: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: TYPE.secondary, fontWeight: '700' },
  tags: { fontSize: TYPE.caption },
});

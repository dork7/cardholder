import { Pressable, StyleSheet } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { strings } from '../strings';
import { Text } from './Text';
import { TYPE, useTheme } from './theme';

// How long a tag must be held before it asks to be removed: long enough that scrolling past, or a
// tap, never gets there.
export const REMOVE_HOLD_MS = 2000;

interface Props {
  tag: string;
  onRemove: (tag: string) => void; // after the hold; the caller asks before removing
  testID?: string;
}

// One of a card's tags. Holding it fills it with red from the left over two seconds, then asks to
// remove it; letting go early drains the fill and nothing happens.
export function TagPill({ tag, onRemove, testID }: Props) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const hold = useSharedValue(0);
  const fill = useAnimatedStyle(() => ({ width: `${hold.value * 100}%` }));

  return (
    <Pressable
      onPressIn={() => {
        if (!reduceMotion) hold.value = withTiming(1, { duration: REMOVE_HOLD_MS, easing: Easing.linear });
      }}
      onPressOut={() => {
        hold.value = withTiming(0, { duration: reduceMotion ? 0 : 150 });
      }}
      onLongPress={() => onRemove(tag)}
      delayLongPress={REMOVE_HOLD_MS}
      accessibilityRole="button"
      accessibilityLabel={strings.tags.label(tag)}
      accessibilityHint={strings.tags.holdHint}
      // Screen readers can remove it from the actions menu instead of holding; it still asks first.
      accessibilityActions={[{ name: 'remove', label: strings.tags.removeAction }]}
      onAccessibilityAction={(e) => e.nativeEvent.actionName === 'remove' && onRemove(tag)}
      // The pill is small; the extra reach stays inside the 6 pt gaps between pills.
      hitSlop={{ top: 3, bottom: 3, left: 3, right: 3 }}
      testID={testID}
      style={[styles.pill, { backgroundColor: theme.bannerBg }]}
    >
      <Animated.View style={[styles.fill, { backgroundColor: theme.danger }, fill]} pointerEvents="none" />
      <Text style={[styles.text, { color: theme.text }]} numberOfLines={1}>
        {tag}
      </Text>
    </Pressable>
  );
}

// The "+ Tag" pill after a card's tags: outlined, so it reads as an action rather than another tag.
export function AddTagPill({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={strings.tags.titleOne}
      accessibilityHint={strings.tags.addHint}
      hitSlop={8}
      testID="add-tag"
      style={({ pressed }) => [styles.pill, styles.add, { borderColor: theme.rosette, opacity: pressed ? 0.7 : 1 }]}
    >
      <Text style={[styles.text, { color: theme.text }]}>+ {strings.tags.add}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: { borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 5, maxWidth: '100%', overflow: 'hidden', justifyContent: 'center' },
  add: { borderWidth: 1, paddingVertical: 4 },
  fill: { position: 'absolute', top: 0, bottom: 0, left: 0, opacity: 0.45 },
  text: { fontSize: TYPE.caption, fontWeight: '700' },
});

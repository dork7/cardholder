import { Pressable, StyleSheet, View } from 'react-native';
import { strings } from '../strings';
import { Text } from './Text';
import { RADIUS, TYPE, useTheme } from './theme';

interface Props {
  tag: string;
  onRemove: (tag: string) => void; // one tap on the ×; the caller removes it at once and offers Undo
  testID?: string;
}

// One of a card's tags, with a × that takes it off this card. The × is its own 44 pt button, so the
// tag's name is never a tap target and a tap on the × does exactly one thing.
export function TagPill({ tag, onRemove, testID }: Props) {
  const theme = useTheme();
  return (
    <View testID={testID} style={[styles.pill, styles.removable, { backgroundColor: theme.bannerBg }]}>
      <Text style={[styles.text, styles.name, { color: theme.text }]} numberOfLines={1} accessibilityLabel={strings.tags.label(tag)}>
        {tag}
      </Text>
      <Pressable
        onPress={() => onRemove(tag)}
        accessibilityRole="button"
        accessibilityLabel={strings.tags.removeLabel(tag)}
        testID={testID && `${testID}-remove`}
        style={({ pressed }) => [styles.remove, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Text style={[styles.cross, { color: theme.muted }]} importantForAccessibility="no" accessibilityElementsHidden>
          ×
        </Text>
      </Pressable>
    </View>
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
  pill: { borderRadius: RADIUS.sm, paddingHorizontal: 12, paddingVertical: 5, maxWidth: '100%', overflow: 'hidden', justifyContent: 'center' },
  add: { borderWidth: 1, paddingVertical: 4 },
  // The × fills the pill's height, so the pill is 44 pt tall and the name sits left of it.
  removable: { flexDirection: 'row', alignItems: 'center', paddingVertical: 0, paddingRight: 0 },
  name: { flexShrink: 1 },
  remove: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  cross: { fontSize: TYPE.body, fontWeight: '700' },
  text: { fontSize: TYPE.caption, fontWeight: '700' },
});

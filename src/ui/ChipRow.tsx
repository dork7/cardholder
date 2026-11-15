import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { RADIUS, TYPE, useTheme } from './theme';

export interface Chip {
  key: string;
  label: string;
  onPress: () => void;
  selected?: boolean; // a choice; leave undefined for an action like "Manage"
  testID?: string;
}

// A scrolling row of square chips, styled like TagChips. The choices are radios in one group; an
// action chip is an outlined button after the group, so a screen reader doesn't count it as a choice.
export function ChipRow({
  chips,
  accessibilityLabel,
  testID,
}: {
  chips: Chip[];
  accessibilityLabel?: string;
  testID?: string; // on the group of choices
}) {
  const choices = chips.filter((chip) => chip.selected !== undefined);
  const actions = chips.filter((chip) => chip.selected === undefined);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroller} contentContainerStyle={styles.row}>
      {choices.length > 0 && (
        <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} testID={testID}>
          {choices.map((chip) => (
            <ChipButton key={chip.key} chip={chip} />
          ))}
        </View>
      )}
      {actions.map((chip) => (
        <ChipButton key={chip.key} chip={chip} />
      ))}
    </ScrollView>
  );
}

function ChipButton({ chip }: { chip: Chip }) {
  const theme = useTheme();
  const action = chip.selected === undefined;
  const selected = chip.selected === true;
  return (
    <Pressable
      onPress={chip.onPress}
      accessibilityRole={action ? 'button' : 'radio'}
      accessibilityLabel={chip.label}
      accessibilityState={action ? undefined : { checked: selected }}
      testID={chip.testID}
      style={[
        styles.chip,
        action ? { borderWidth: 1, borderColor: theme.rosette } : { backgroundColor: selected ? theme.accent : theme.bannerBg },
      ]}
    >
      <Text
        style={[styles.text, { color: selected ? theme.onAccent : theme.text, fontWeight: selected || action ? '700' : '400' }]}
      >
        {chip.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // A horizontal ScrollView otherwise grows to fill a column, stretching every chip tall.
  scroller: { flexGrow: 0 },
  row: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  // 44 pt: the smallest comfortable touch target.
  chip: { minHeight: 44, paddingHorizontal: 16, justifyContent: 'center', borderRadius: RADIUS.sm },
  text: { fontSize: TYPE.secondary },
});

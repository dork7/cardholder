import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { Text } from './Text';
import { TYPE, useTheme } from './theme';

export interface Chip {
  key: string;
  label: string;
  onPress: () => void;
  selected?: boolean; // a choice; leave undefined for an action like "New folder"
  testID?: string;
}

// A scrolling row of pill chips, styled like CategoryChips. Choices are radios; an action chip is an
// outlined button at the end of the row.
export function ChipRow({ chips, accessibilityLabel }: { chips: Chip[]; accessibilityLabel?: string }) {
  const theme = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroller}
      contentContainerStyle={styles.row}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
    >
      {chips.map((chip) => {
        const action = chip.selected === undefined;
        const selected = chip.selected === true;
        return (
          <Pressable
            key={chip.key}
            onPress={chip.onPress}
            accessibilityRole={action ? 'button' : 'radio'}
            accessibilityLabel={chip.label}
            accessibilityState={action ? undefined : { checked: selected }}
            testID={chip.testID}
            style={[
              styles.chip,
              action
                ? { borderWidth: 1, borderColor: theme.rosette }
                : { backgroundColor: selected ? theme.accent : theme.bannerBg },
            ]}
          >
            <Text
              style={[
                styles.text,
                { color: selected ? theme.onAccent : theme.text, fontWeight: selected || action ? '700' : '400' },
              ]}
            >
              {chip.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // A horizontal ScrollView otherwise grows to fill a column, stretching every chip tall.
  scroller: { flexGrow: 0 },
  row: { gap: 8, paddingVertical: 4 },
  chip: { minHeight: 40, paddingHorizontal: 16, justifyContent: 'center', borderRadius: 9999 },
  text: { fontSize: TYPE.secondary },
});

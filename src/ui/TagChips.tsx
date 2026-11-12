import { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { sameTag } from '../cards/tags';
import { strings } from '../strings';
import { TYPE, useTheme } from './theme';

interface Props {
  tags: readonly string[]; // the chips, in order
  selected: readonly string[]; // the ones switched on, matched ignoring case
  onPress: (tag: string | null) => void; // null is the "All" chip
  includeAll?: boolean; // a first "All" chip, on while nothing is selected
  multiple?: boolean; // any number can be on (checkboxes); otherwise one at a time (radios)
  onAddNew?: () => void; // shows a last "+ New" chip
  wrap?: boolean; // onto as many lines as it takes, instead of one row that scrolls sideways
}

// A row of tag chips: the home screen's filter (one at a time, with All), or a card's tags on the edit
// screen (any number).
export function TagChips({ tags, selected, onPress, includeAll = false, multiple = false, onAddNew, wrap = false }: Props) {
  const theme = useTheme();
  const options: (string | null)[] = includeAll ? [null, ...tags] : [...tags];
  const chips: ReactNode = (
    <>
      {options.map((option) => {
        const on = option === null ? selected.length === 0 : selected.some((t) => sameTag(t, option));
        const label = option ?? strings.home.allTags;
        return (
          <Pressable
            key={option ?? 'all'}
            onPress={() => onPress(option)}
            accessibilityRole={multiple ? 'checkbox' : 'radio'}
            accessibilityLabel={label}
            accessibilityState={{ checked: on }}
            testID={option === null ? 'tag-chip-all' : `tag-chip-${option}`}
            style={[
              styles.chip,
              { backgroundColor: on ? theme.accent : theme.bannerBg },
            ]}
          >
            <Text style={[styles.text, { color: on ? theme.onAccent : theme.text, fontWeight: on ? '700' : '400' }]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
      {onAddNew && (
        <Pressable
          onPress={onAddNew}
          accessibilityRole="button"
          accessibilityLabel={strings.edit.newTag}
          testID="tag-add"
          style={[styles.chip, { backgroundColor: theme.bannerBg }]}
        >
          <Text style={[styles.text, { color: theme.text }]}>+ {strings.edit.newTagChip}</Text>
        </Pressable>
      )}
    </>
  );
  if (wrap) {
    return (
      <View style={[styles.row, styles.wrap]} accessibilityRole={multiple ? undefined : 'radiogroup'}>
        {chips}
      </View>
    );
  }
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroller}
      contentContainerStyle={styles.row}
      accessibilityRole={multiple ? undefined : 'radiogroup'}
    >
      {chips}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // A horizontal ScrollView otherwise grows to fill a column, stretching every chip tall.
  scroller: { flexGrow: 0 },
  row: { gap: 8, paddingVertical: 4 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  // 44 pt: the smallest comfortable touch target.
  chip: { minHeight: 44, paddingHorizontal: 16, justifyContent: 'center', borderRadius: 9999 },
  text: { fontSize: TYPE.secondary },
});

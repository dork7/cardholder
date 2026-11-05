import { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { categoryLabel } from '../cards/categories';
import { CardCategory } from '../cards/types';
import { strings } from '../strings';
import { TYPE, useTheme } from './theme';

interface Props {
  value: CardCategory | null;
  onChange: (value: CardCategory | null) => void;
  includeAll?: boolean;
  categories: readonly CardCategory[];
  onAddNew?: () => void; // shows a last "+ New" chip
  wrap?: boolean; // onto as many lines as it takes, instead of one row that scrolls sideways
}

export function CategoryChips({ value, onChange, includeAll = false, categories, onAddNew, wrap = false }: Props) {
  const theme = useTheme();
  const options: (CardCategory | null)[] = includeAll ? [null, ...categories] : [...categories];
  const chips: ReactNode = (
    <>
      {options.map((option) => {
        const selected = option === value;
        const label = option ? categoryLabel(option) : strings.home.allCategories;
        return (
          <Pressable
            key={option ?? 'all'}
            onPress={() => onChange(option)}
            accessibilityRole="radio"
            accessibilityLabel={label}
            accessibilityState={{ checked: selected }}
            style={[
              styles.chip,
              { backgroundColor: selected ? theme.accent : theme.bannerBg },
            ]}
          >
            <Text style={[styles.text, { color: selected ? theme.onAccent : theme.text, fontWeight: selected ? '700' : '400' }]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
      {onAddNew && (
        <Pressable
          onPress={onAddNew}
          accessibilityRole="button"
          accessibilityLabel={strings.edit.newCategory}
          testID="category-add"
          style={[styles.chip, { backgroundColor: theme.bannerBg }]}
        >
          <Text style={[styles.text, { color: theme.text }]}>+ {strings.edit.newCategoryChip}</Text>
        </Pressable>
      )}
    </>
  );
  if (wrap) {
    return (
      <View style={[styles.row, styles.wrap]} accessibilityRole="radiogroup">
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
      accessibilityRole="radiogroup"
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
  chip: { minHeight: 40, paddingHorizontal: 16, justifyContent: 'center', borderRadius: 9999 },
  text: { fontSize: TYPE.secondary },
});

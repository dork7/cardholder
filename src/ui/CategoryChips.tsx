import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { Text } from './Text';
import { CATEGORIES, Category } from '../cards/types';
import { strings } from '../strings';
import { useTheme } from './theme';

interface Props {
  value: Category | null;
  onChange: (value: Category | null) => void;
  includeAll?: boolean;
}

export function CategoryChips({ value, onChange, includeAll = false }: Props) {
  const theme = useTheme();
  const options: (Category | null)[] = includeAll ? [null, ...CATEGORIES] : [...CATEGORIES];
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityRole="radiogroup"
    >
      {options.map((option) => {
        const selected = option === value;
        const label = option ? strings.categories[option] : strings.home.allCategories;
        return (
          <Pressable
            key={option ?? 'all'}
            onPress={() => onChange(option)}
            accessibilityRole="radio"
            accessibilityLabel={label}
            accessibilityState={{ checked: selected }}
            style={[
              styles.chip,
              { borderColor: selected ? theme.accent : theme.border, backgroundColor: selected ? theme.accent : theme.surface },
            ]}
          >
            <Text style={[styles.text, { color: selected ? theme.onAccent : theme.text }]}>{label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 4 },
  chip: { minHeight: 40, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 20, borderWidth: 1 },
  text: { fontSize: 16 },
});

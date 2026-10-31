import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { categoryLabel } from '../cards/categories';
import { CardCategory } from '../cards/types';
import { strings } from '../strings';
import { Button } from './Button';
import { Text } from './Text';
import { TYPE, useTheme } from './theme';

interface Props {
  visible: boolean;
  title: string;
  categories: readonly CardCategory[];
  onChoose: (category: CardCategory) => void;
  onClose: () => void;
}

// A sheet from the bottom listing every category, for moving the cards picked in the gallery.
export function CategorySheet({ visible, title, categories, onChoose, onClose }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={strings.common.cancel} />
      <View style={[styles.sheet, { backgroundColor: theme.bannerBg, paddingBottom: insets.bottom + 16 }]} testID="category-sheet">
        <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
          {title}
        </Text>
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {categories.map((category) => (
            <Pressable
              key={category}
              onPress={() => onChoose(category)}
              accessibilityRole="button"
              testID={`move-to-${category}`}
              style={({ pressed }) => [styles.row, { backgroundColor: theme.surface, opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={[styles.rowText, { color: theme.text }]}>{categoryLabel(category)}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Button variant="secondary" label={strings.common.cancel} onPress={onClose} testID="category-sheet-cancel" />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, gap: 12, maxHeight: '70%' },
  title: { fontSize: TYPE.section, fontWeight: '700', paddingHorizontal: 4 },
  list: { flexGrow: 0 },
  listContent: { gap: 8 },
  row: { minHeight: 52, borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
  rowText: { fontSize: TYPE.body },
});

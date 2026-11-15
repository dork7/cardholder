import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GallerySort } from '../cards/listing';
import { strings } from '../strings';
import { Button } from './Button';
import { ChipRow } from './ChipRow';
import { Text } from './Text';
import { RADIUS, TRACKING, TYPE, useTheme } from './theme';

export const SORT_LABELS: Record<GallerySort, string> = {
  name: strings.home.sortName,
  expiry: strings.home.sortExpiry,
  added: strings.home.sortAdded,
};

interface Props {
  visible: boolean;
  sort: GallerySort;
  expiringOnly: boolean;
  onSort: (sort: GallerySort) => void;
  onToggleExpiring: () => void;
  onClose: () => void;
}

// The gallery's Sort sheet: the order (one of three, as radios) and the "Expiring soon" filter.
// Each change applies at once; Done only closes the sheet.
export function SortSheet({ visible, sort, expiringOnly, onSort, onToggleExpiring, onClose }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const orders = (Object.keys(SORT_LABELS) as GallerySort[]).map((key) => ({
    key,
    label: SORT_LABELS[key],
    selected: sort === key,
    onPress: () => onSort(key),
    testID: `sort-${key}`,
  }));
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.fill} onPress={onClose} accessibilityLabel={strings.common.close} />
      <View style={[styles.sheet, { backgroundColor: theme.bannerBg, paddingBottom: insets.bottom + 16 }]} testID="sort-sheet">
        <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
          {strings.home.sortLabel}
        </Text>
        <Text style={[styles.label, { color: theme.muted }]}>{strings.home.sortOrder}</Text>
        <ChipRow accessibilityLabel={strings.home.sortOrder} chips={orders} />
        <Text style={[styles.label, { color: theme.muted }]}>{strings.home.filterLabel}</Text>
        <Pressable
          onPress={onToggleExpiring}
          accessibilityRole="checkbox"
          accessibilityLabel={strings.home.expiringSoon}
          accessibilityState={{ checked: expiringOnly }}
          testID="filter-expiring"
          style={({ pressed }) => [
            styles.chip,
            { backgroundColor: expiringOnly ? theme.accent : theme.surface, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[styles.chipText, { color: expiringOnly ? theme.onAccent : theme.text }]}>
            {strings.home.expiringSoon}
          </Text>
        </Pressable>
        <Button label={strings.home.sortDone} onPress={onClose} testID="sort-sheet-done" />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  sheet: { borderTopLeftRadius: RADIUS.none, borderTopRightRadius: RADIUS.none, padding: 16, gap: 12 },
  title: { fontSize: TYPE.section, fontWeight: '700', letterSpacing: TRACKING.tight, paddingHorizontal: 4 },
  label: { fontSize: TYPE.caption, fontWeight: '600', textTransform: 'uppercase', letterSpacing: TRACKING.caps, paddingHorizontal: 4 },
  chip: { minHeight: 44, borderRadius: RADIUS.sm, paddingHorizontal: 16, justifyContent: 'center', alignSelf: 'flex-start' },
  chipText: { fontSize: TYPE.secondary, fontWeight: '700' },
});

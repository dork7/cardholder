import { Pressable, StyleSheet, View } from 'react-native';
import { GallerySort } from '../cards/listing';
import { strings } from '../strings';
import { Sheet } from './Sheet';
import { Text } from './Text';
import { TYPE, useTheme } from './theme';

interface Props {
  visible: boolean;
  sort: GallerySort;
  expiringOnly: boolean;
  onSort: (sort: GallerySort) => void;
  onExpiringOnly: (on: boolean) => void;
  onClose: () => void;
}

const orders: [GallerySort, string][] = [
  ['name', strings.home.sortName],
  ['expiry', strings.home.sortExpiry],
  ['added', strings.home.sortAdded],
];

export function SortSheet({ visible, sort, expiringOnly, onSort, onExpiringOnly, onClose }: Props) {
  const theme = useTheme();
  return (
    <Sheet visible={visible} onClose={onClose} backdropLabel={strings.common.close} style={styles.sheet} testID="sort-sheet">
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">{strings.home.sortLabel}</Text>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={strings.common.close} testID="sort-close" style={styles.close}>
          <Text style={{ color: theme.text, fontSize: TYPE.secondary }}>{strings.common.close}</Text>
        </Pressable>
      </View>
      <View accessibilityRole="radiogroup" accessibilityLabel={strings.home.sortLabel}>
        {orders.map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => onSort(key)}
            accessibilityRole="radio"
            accessibilityLabel={label}
            accessibilityState={{ checked: sort === key }}
            testID={`sort-${key}`}
            style={[styles.option, { borderColor: theme.border }]}
          >
            <Text style={{ color: theme.text, fontSize: TYPE.body }}>{label}</Text>
            <Text style={{ color: theme.selection, fontSize: TYPE.body }}>{sort === key ? '■' : '□'}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        onPress={() => onExpiringOnly(!expiringOnly)}
        accessibilityRole="checkbox"
        accessibilityLabel={strings.home.expiringSoon}
        accessibilityState={{ checked: expiringOnly }}
        testID="filter-expiring"
        style={[styles.option, { borderColor: theme.border }]}
      >
        <Text style={{ color: theme.text, fontSize: TYPE.body }}>{strings.home.expiringSoon}</Text>
        <Text style={{ color: theme.selection, fontSize: TYPE.body }}>{expiringOnly ? '■' : '□'}</Text>
      </Pressable>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  sheet: { gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: TYPE.section, fontWeight: '700' },
  close: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' },
  option: { minHeight: 48, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth },
});

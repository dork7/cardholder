import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { strings } from '../strings';
import { Button } from './Button';
import { Text } from './Text';
import { RADIUS, TYPE, useTheme } from './theme';

export function DeleteSheet({ visible, onCancel, onDelete, busy = false, title = strings.edit.deleteConfirmTitle, body = strings.edit.deleteConfirmBody }: {
  visible: boolean; onCancel: () => void; onDelete: () => void; busy?: boolean; title?: string; body?: string;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel} statusBarTranslucent>
    <View style={styles.overlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityRole="button"
        accessibilityLabel={strings.common.cancel} testID="delete-backdrop" />
      <View accessibilityViewIsModal testID="delete-sheet" style={[styles.sheet, {
        backgroundColor: theme.bannerBg, paddingBottom: insets.bottom + 16,
      }]}>
        <View style={[styles.handle, { backgroundColor: theme.rosette }]} accessibilityElementsHidden />
        <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.body, { color: theme.text }]}>{body}</Text>
        <View style={styles.actions}>
          <View style={styles.action}><Button variant="secondary" label={strings.common.cancel} onPress={onCancel} testID="delete-cancel" /></View>
          <View style={styles.action}><Button variant="danger" label={strings.common.delete} onPress={onDelete} disabled={busy} testID="delete-confirm" /></View>
        </View>
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.42)' },
  sheet: { borderTopLeftRadius: RADIUS.md, borderTopRightRadius: RADIUS.md, padding: 16, gap: 16 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center' },
  title: { fontSize: TYPE.section, fontWeight: '700' },
  body: { fontSize: TYPE.body },
  actions: { flexDirection: 'row', gap: 12 },
  action: { flex: 1 },
});

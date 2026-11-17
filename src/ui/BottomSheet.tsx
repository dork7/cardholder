import { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { strings } from '../strings';
import { Text } from './Text';
import { RADIUS, TYPE, useTheme } from './theme';

interface Props {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  testID?: string;
}

// One bottom sheet for small flows kept over the screen behind: a drag handle, a header with a Close
// button, a backdrop that closes on tap, hardware back, safe-area spacing, and content that scrolls
// when it is long (large text, small screens). Full pages use a routed formSheet instead (app/_layout.tsx).
export function BottomSheet({ visible, title, onClose, children, testID }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.fill}>
        <Pressable style={styles.fill} onPress={onClose} accessibilityRole="button" accessibilityLabel={strings.common.close} testID={testID && `${testID}-backdrop`} />
        <View
          accessibilityViewIsModal
          testID={testID}
          style={[styles.sheet, { backgroundColor: theme.bannerBg, paddingBottom: insets.bottom + 16, maxHeight: height * 0.85 }]}
        >
          <View style={[styles.handle, { backgroundColor: theme.rosette }]} />
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">{title}</Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={strings.common.close} testID={testID && `${testID}-close`} style={styles.close}>
              <Text style={{ color: theme.text, fontSize: TYPE.secondary }}>{strings.common.close}</Text>
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  sheet: { borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg, paddingHorizontal: 16, paddingTop: 8 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, opacity: 0.5, marginBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { flexShrink: 1, fontSize: TYPE.section, fontWeight: '700' },
  close: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' },
  content: { gap: 12, paddingVertical: 8 },
});

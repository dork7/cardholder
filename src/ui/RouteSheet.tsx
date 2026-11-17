import { ReactNode } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { strings } from '../strings';
import { Text } from './Text';
import { RADIUS, TYPE, useTheme } from './theme';

export function RouteSheet({ title, onClose, children, testID }: {
  title: string; onClose: () => void; children: ReactNode; testID: string;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  return (
    <View style={styles.overlay}>
      <Pressable testID={`${testID}-backdrop`} style={StyleSheet.absoluteFill} onPress={onClose}
        accessibilityRole="button" accessibilityLabel={strings.sheet.dismiss}
        accessibilityHint={strings.sheet.dismissHint} />
      <View testID={testID} accessibilityViewIsModal style={[styles.sheet, {
        backgroundColor: theme.surface, borderColor: theme.border,
        height: Math.max(0, height - Math.max(insets.top + 24, 48)),
        paddingBottom: insets.bottom,
      }]}>
        <View style={styles.header}>
          <View style={[styles.handle, { backgroundColor: theme.rosette }]} accessibilityElementsHidden />
          <View style={styles.heading}>
            <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{title}</Text>
            <Pressable testID={`${testID}-close`} onPress={onClose} accessibilityRole="button"
              accessibilityLabel={strings.sheet.dismiss} style={styles.close}>
              <Text style={{ color: theme.accent, fontSize: TYPE.secondary }}>{strings.common.close}</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.body}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.42)' },
  sheet: { borderTopLeftRadius: RADIUS.md, borderTopRightRadius: RADIUS.md, borderWidth: 1, overflow: 'hidden' },
  header: { paddingHorizontal: 16, paddingTop: 8 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  title: { fontSize: TYPE.section, fontWeight: '700', flexShrink: 1 },
  close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, minHeight: 0 },
});

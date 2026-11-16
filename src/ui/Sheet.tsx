import { ReactNode } from 'react';
import { AccessibilityRole, KeyboardAvoidingView, Modal, Platform, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { strings } from '../strings';
import { RADIUS, useTheme } from './theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  // What the backdrop says to screen readers; tapping it closes the sheet.
  backdropLabel?: string;
  // Lifts the sheet above the keyboard (iOS), for sheets with a text field.
  avoidKeyboard?: boolean;
  accessibilityRole?: AccessibilityRole;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  children: ReactNode;
}

// The shell every bottom sheet shares: a modal that slides up over a backdrop that closes it, with the
// panel kept clear of the home indicator.
export function Sheet({ visible, onClose, backdropLabel = strings.common.cancel, avoidKeyboard, accessibilityRole, style, testID, children }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const content = (
    <>
      <Pressable style={styles.fill} onPress={onClose} accessibilityLabel={backdropLabel} />
      <View
        style={[styles.sheet, { backgroundColor: theme.bannerBg, paddingBottom: insets.bottom + 16 }, style]}
        accessibilityRole={accessibilityRole}
        testID={testID}
      >
        {children}
      </View>
    </>
  );
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      {avoidKeyboard ? (
        <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {content}
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.fill}>{content}</View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  sheet: { borderTopLeftRadius: RADIUS.none, borderTopRightRadius: RADIUS.none, padding: 16 },
});

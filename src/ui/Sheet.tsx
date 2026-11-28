import { ReactNode } from 'react';
import { AccessibilityRole, KeyboardAvoidingView, Modal, Platform, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { strings } from '../strings';
import { useKeyboardHeight } from './useKeyboardHeight';
import { RADIUS, useTheme } from './theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  // What the backdrop says to screen readers; tapping it closes the sheet.
  backdropLabel?: string;
  // Lifts the sheet above the keyboard, for sheets with a text field.
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
  // Android draws edge to edge, so a Modal's window isn't resized for the keyboard and
  // KeyboardAvoidingView does nothing there: the sheet moves up by the keyboard's height (#91).
  const keyboard = useKeyboardHeight();
  const lift = avoidKeyboard && Platform.OS === 'android' ? keyboard : 0;
  const content = (
    <>
      <Pressable style={styles.fill} onPress={onClose} accessibilityLabel={backdropLabel} />
      <View
        style={[styles.sheet, { backgroundColor: theme.bannerBg, paddingBottom: (lift ? 0 : insets.bottom) + 16, marginBottom: lift }, style]}
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

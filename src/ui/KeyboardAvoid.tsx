import { ComponentRef, ReactNode, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleProp, View, ViewStyle } from 'react-native';

// A screen's content, kept clear of the on-screen keyboard on both platforms. Android draws edge to
// edge, so the window no longer resizes for the keyboard: the view shrinks itself instead (#91).
// Keyboard coordinates are window-relative, so it measures where it starts (below a native header).
export function KeyboardAvoid({ style, children }: { style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const container = useRef<ComponentRef<typeof View>>(null);
  const [offset, setOffset] = useState(0);
  return (
    <View ref={container} style={[{ flex: 1 }, style]} onLayout={() => container.current?.measureInWindow((_x, y) => setOffset(y))}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={offset}>
        {children}
      </KeyboardAvoidingView>
    </View>
  );
}

import { ReactNode } from 'react';
import { LayoutChangeEvent, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { RADIUS, useTheme } from './theme';

// The page every screen sits on.
export function Screen({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return <View style={[styles.screen, { backgroundColor: theme.bg }, style]}>{children}</View>;
}

interface PanelProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  testID?: string;
  onLayout?: (e: LayoutChangeEvent) => void;
}

// A solid surface one step up from the page, square, with a hairline rule round it.
export function Panel({ children, style, radius = RADIUS.none, testID, onLayout }: PanelProps) {
  const theme = useTheme();
  return (
    <View
      testID={testID}
      onLayout={onLayout}
      style={[
        styles.panel,
        { borderRadius: radius, backgroundColor: theme.surface, borderColor: theme.border },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  panel: { borderWidth: StyleSheet.hairlineWidth },
});

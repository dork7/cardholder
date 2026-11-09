import { ReactNode } from 'react';
import { LayoutChangeEvent, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from './theme';

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

// A solid surface one step up from the page; the lighter shade is what lifts it.
export function Panel({ children, style, radius = 8, testID, onLayout }: PanelProps) {
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

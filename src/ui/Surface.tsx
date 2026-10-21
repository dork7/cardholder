import { ReactNode } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
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
}

// A solid surface one step up from the page. In dark mode elevation is the lighter grey, not a shadow.
export function Panel({ children, style, radius = 20, testID }: PanelProps) {
  const theme = useTheme();
  return (
    <View
      testID={testID}
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

import { ReactNode } from 'react';
import { BlurView } from 'expo-blur';
import { LayoutChangeEvent, Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { RADIUS, SHADOW, useTheme } from './theme';

// The page every screen sits on.
export function Screen({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return <View style={[styles.screen, { backgroundColor: theme.bg }, style]}>
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <RadialGradient id="sky" cx="88%" cy="14%" rx="72%" ry="58%">
          <Stop offset="0" stopColor={theme.blurTint === 'light' ? '#DCE8FF' : '#29456D'} stopOpacity="0.95" />
          <Stop offset="1" stopColor={theme.bg} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="lilac" cx="4%" cy="92%" rx="70%" ry="52%">
          <Stop offset="0" stopColor={theme.blurTint === 'light' ? '#EDE1F5' : '#352D54'} stopOpacity="0.8" />
          <Stop offset="1" stopColor={theme.bg} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#sky)" />
      <Rect width="100%" height="100%" fill="url(#lilac)" />
    </Svg>
    {children}
  </View>;
}

export function GlassSurface({ children, style, strong = false, testID }: {
  children: ReactNode; style?: StyleProp<ViewStyle>; strong?: boolean; testID?: string;
}) {
  const theme = useTheme();
  return (
    <View testID={testID} style={[styles.glass, { backgroundColor: strong ? theme.glassStrong : theme.glass, borderColor: theme.border }, style]}>
      {Platform.OS === 'ios' && <BlurView pointerEvents="none" tint={theme.blurTint} intensity={55} style={StyleSheet.absoluteFill} />}
      {children}
    </View>
  );
}

interface PanelProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  testID?: string;
  onLayout?: (e: LayoutChangeEvent) => void;
}

export function Panel({ children, style, radius = RADIUS.none, testID, onLayout }: PanelProps) {
  const theme = useTheme();
  return (
    <View
      testID={testID}
      onLayout={onLayout}
      style={[
        styles.panel,
        { borderRadius: radius === RADIUS.none ? RADIUS.md : radius, backgroundColor: theme.glassStrong, borderColor: theme.border },
        style,
      ]}
    >
      {Platform.OS === 'ios' && <BlurView pointerEvents="none" tint={theme.blurTint} intensity={45} style={StyleSheet.absoluteFill} />}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  panel: { borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', ...SHADOW.medium },
  glass: { borderWidth: 1, borderRadius: RADIUS.lg, overflow: 'hidden', ...SHADOW.heavy },
});

import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Text } from './Text';
import { SHADOW, TYPE, useTheme } from './theme';
import { useTooltip } from './Tooltip';

export interface FabProps {
  label: string;
  onPress: () => void;
  testID?: string;
}

// Floating "+" button pinned to the bottom-right corner, clear of the home indicator.
export function Fab({ label, onPress, testID }: FabProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { ref, onLongPress, tooltip } = useTooltip(label);
  return (
    <Pressable
      ref={ref}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      testID={testID}
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        { bottom: 24 + insets.bottom, backgroundColor: theme.accent, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Svg width={24} height={24} viewBox="0 0 24 24">
        <Path d="M12 4v16M4 12h16" stroke={theme.onAccent} strokeWidth={2.5} strokeLinecap="round" />
      </Svg>
      {tooltip}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    position: 'absolute',
    end: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.heavy,
  },
  ask: {
    position: 'absolute',
    end: 24,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 9999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...SHADOW.medium,
  },
  askLabel: { fontSize: TYPE.secondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.4 },
});

// "Ask", sitting just above the "+" button: a pill two steps up from the page, so the add button stays
// the one primary action. Opens the Ask window (AskSheet).
export function AskFab({ label, hint, onPress, testID }: FabProps & { hint?: string }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={onPress}
      testID={testID}
      hitSlop={8}
      style={({ pressed }) => [
        styles.ask,
        { bottom: 24 + 56 + 16 + insets.bottom, backgroundColor: theme.bannerBg, borderColor: theme.rosette, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      {/* A speech bubble with a question mark. */}
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path d="M4 5h16v11H9l-5 4z" stroke={theme.text} strokeWidth={2} strokeLinejoin="round" />
        <Path d="M10 9a2 2 0 1 1 3 1.7c-.6.4-1 .8-1 1.3" stroke={theme.text} strokeWidth={2} strokeLinecap="round" />
        <Path d="M12 14.5h.01" stroke={theme.text} strokeWidth={2.5} strokeLinecap="round" />
      </Svg>
      <Text style={[styles.askLabel, { color: theme.text }]}>{label}</Text>
    </Pressable>
  );
}

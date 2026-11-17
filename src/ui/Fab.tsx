import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SHADOW, useTheme } from './theme';
import { useTooltip } from './Tooltip';
import { RetroIcon } from './RetroIcon';

export interface FabProps {
  label: string;
  onPress: () => void;
  testID?: string;
  // Extra space above the bottom edge, for the tab bar the button floats over.
  lift?: number;
}

// Floating round "+" button at the bottom-right corner, above the tab bar and the home indicator.
export function Fab({ label, onPress, testID, lift = 0 }: FabProps) {
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
        { bottom: 24 + insets.bottom + lift, backgroundColor: theme.accent, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <RetroIcon name="plus" color={theme.onAccent} />
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
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.heavy,
  },
});

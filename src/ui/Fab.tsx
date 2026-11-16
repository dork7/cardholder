import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RADIUS, SHADOW, useTheme } from './theme';
import { useTooltip } from './Tooltip';
import { RetroIcon } from './RetroIcon';

export interface FabProps {
  label: string;
  onPress: () => void;
  testID?: string;
}

// Floating square "+" button pinned to the bottom-right corner, clear of the home indicator.
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
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.heavy,
  },
});

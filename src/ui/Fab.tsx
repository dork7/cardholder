import { Pressable, StyleSheet, View } from 'react-native';
import { SHADOW, useTheme } from './theme';
import { useTooltip } from './Tooltip';
import { RetroIcon } from './RetroIcon';
import { useTabBarClearance } from './TabBar';

export interface FabProps {
  label: string;
  onPress: () => void;
  testID?: string;
}

// Round blue "+" floating above the tab bar at the bottom right, as in the prototype: an inset
// 1 px top highlight stands in for the prototype's inner shadow.
export function Fab({ label, onPress, testID }: FabProps) {
  const theme = useTheme();
  const bottom = useTabBarClearance();
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
      style={({ pressed }) => [styles.base, { bottom, backgroundColor: theme.accent, opacity: pressed ? 0.7 : 1 }]}
    >
      <View pointerEvents="none" style={styles.highlight} />
      <RetroIcon name="plus" size={28} color={theme.onAccent} />
      {tooltip}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    position: 'absolute',
    end: 20,
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.heavy,
  },
  // Clipped to the circle by the parent's radius isn't possible without overflow hidden (which
  // would clip the tooltip), so the highlight is a thin arc-width strip inset from the edges.
  highlight: { position: 'absolute', top: 1, start: 14, end: 14, height: 1, borderRadius: 1, backgroundColor: 'rgba(255, 255, 255, 0.35)' },
});

import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from './theme';

export interface FabProps {
  label: string;
  onPress: () => void;
  testID?: string;
}

// Floating "+" button pinned to the bottom-right corner, clear of the home indicator.
export function Fab({ label, onPress, testID }: FabProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Pressable
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
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
});

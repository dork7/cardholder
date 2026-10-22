import { Pressable, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from './theme';

export type IconName = 'trash' | 'share' | 'edit';

// 24 × 24 line icons in the app's stroke style.
const PATHS: Record<IconName, string[]> = {
  trash: ['M4 7h16', 'M9 7V4h6v3', 'M6 7l1 13h10l1-13', 'M10 11v6', 'M14 11v6'],
  share: ['M12 3v12', 'M7 8l5-5 5 5', 'M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6'],
  edit: ['M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z', 'M13.5 6.5l4 4'],
};

interface Props {
  icon: IconName;
  label: string; // spoken by screen readers; the icon alone carries no text
  onPress: () => void;
  variant?: 'secondary' | 'danger';
  testID?: string;
}

// An outlined button with only an icon. Same outline rules as Button: 3:1 against the page.
export function IconButton({ icon, label, onPress, variant = 'secondary', testID }: Props) {
  const theme = useTheme();
  const color = variant === 'danger' ? theme.danger : theme.accent;
  const outline = variant === 'danger' ? theme.danger : theme.muted;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      testID={testID}
      hitSlop={4}
      style={({ pressed }) => [styles.base, { borderColor: outline, opacity: pressed ? 0.7 : 1 }]}
    >
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        {PATHS[icon].map((d) => (
          <Path key={d} d={d} stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
    minHeight: 56,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

import { Pressable, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from './theme';

export type IconName = 'trash' | 'share' | 'edit' | 'pin' | 'unpin' | 'present';

// 24 × 24 line icons in the app's stroke style.
const PATHS: Record<IconName, string[]> = {
  trash: ['M4 7h16', 'M9 7V4h6v3', 'M6 7l1 13h10l1-13', 'M10 11v6', 'M14 11v6'],
  share: ['M12 3v12', 'M7 8l5-5 5 5', 'M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6'],
  edit: ['M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z', 'M13.5 6.5l4 4'],
  pin: ['M9 3h6', 'M10 3v6l-3 4h10l-3-4V3', 'M12 13v8'],
  // A hand holding out a card.
  present: ['M3 14h4l3 2h5a1.5 1.5 0 0 1 0 3H9', 'M3 21h11l6-4a1.6 1.6 0 0 0-2-2.5l-3 2', 'M9 4h11v7H9z'],
  unpin: ['M9 3h6', 'M10 3v6l-3 4h10l-3-4V3', 'M12 13v8', 'M3 3l18 18'],
};

interface Props {
  icon: IconName;
  label: string; // spoken by screen readers; the icon alone carries no text
  hint?: string;
  onPress: () => void;
  variant?: 'secondary' | 'danger';
  testID?: string;
}

// An outlined button with only an icon. Same outline rules as Button: 3:1 against the page.
export function IconButton({ icon, label, hint, onPress, variant = 'secondary', testID }: Props) {
  const theme = useTheme();
  const color = variant === 'danger' ? theme.danger : theme.text;
  const outline = variant === 'danger' ? theme.danger : theme.rosette;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
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
    borderRadius: 9999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

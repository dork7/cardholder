import { Pressable, StyleSheet } from 'react-native';
import { ActionIconName, RetroIcon } from './RetroIcon';
import { Text } from './Text';
import { RADIUS, TYPE, useTheme } from './theme';
import { useTooltip } from './Tooltip';

export type IconName = ActionIconName;

interface Props {
  icon: IconName;
  label: string; // spoken by screen readers; the icon alone carries no text
  caption?: string; // a short word under the icon, so the action is readable at a glance
  hint?: string;
  onPress: () => void;
  variant?: 'secondary' | 'danger';
  disabled?: boolean;
  expanded?: boolean; // set on a button that opens a menu: whether the menu is open
  testID?: string;
}

// An outlined button with only an icon. Same outline rules as Button: 3:1 against the page.
export function IconButton({ icon, label, caption, hint, onPress, variant = 'secondary', disabled = false, expanded, testID }: Props) {
  const theme = useTheme();
  const color = variant === 'danger' ? theme.danger : theme.text;
  const outline = variant === 'danger' ? theme.danger : theme.rosette;
  const { ref, onLongPress, tooltip } = useTooltip(label);
  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={disabled || expanded !== undefined ? { disabled, expanded } : undefined}
      disabled={disabled}
      onPress={onPress}
      onLongPress={onLongPress}
      testID={testID}
      hitSlop={4}
      style={({ pressed }) => [styles.base, { borderColor: outline, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 }]}
    >
      <RetroIcon name={icon} size={24} color={color} />
      {caption && (
        <Text style={[styles.caption, { color }]} numberOfLines={2}>
          {caption}
        </Text>
      )}
      {tooltip}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
    minHeight: 56,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 6,
  },
  // Two lines at most: at large text sizes a caption wraps rather than being cut off.
  caption: { fontSize: TYPE.caption, fontWeight: '600', textAlign: 'center' },
});

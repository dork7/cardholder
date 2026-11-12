import { Pressable, StyleSheet } from 'react-native';
import { ActionIconName, RetroIcon } from './RetroIcon';
import { useTheme } from './theme';
import { useTooltip } from './Tooltip';

export type IconName = ActionIconName;

interface Props {
  icon: IconName;
  label: string; // spoken by screen readers; the icon alone carries no text
  hint?: string;
  onPress: () => void;
  variant?: 'secondary' | 'danger';
  disabled?: boolean;
  testID?: string;
}

// An outlined button with only an icon. Same outline rules as Button: 3:1 against the page.
export function IconButton({ icon, label, hint, onPress, variant = 'secondary', disabled = false, testID }: Props) {
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
      accessibilityState={disabled ? { disabled } : undefined}
      disabled={disabled}
      onPress={onPress}
      onLongPress={onLongPress}
      testID={testID}
      hitSlop={4}
      style={({ pressed }) => [styles.base, { borderColor: outline, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 }]}
    >
      <RetroIcon name={icon} size={24} color={color} />
      {tooltip}
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

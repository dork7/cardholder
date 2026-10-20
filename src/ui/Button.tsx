import { Pressable, StyleSheet } from 'react-native';
import { Text } from './Text';
import { useTheme } from './theme';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  testID?: string;
  accessibilityHint?: string;
}

export function Button({ label, onPress, variant = 'primary', disabled = false, testID, accessibilityHint }: ButtonProps) {
  const theme = useTheme();
  const primary = variant === 'primary';
  const color = primary ? theme.onAccent : variant === 'danger' ? theme.danger : theme.accent;
  // The outline is what shows where a transparent button is, so it needs 3:1 against the paper
  // (hairline `border` is far too faint for that): muted ink for secondary, stamp red for danger.
  const outline = primary ? theme.accent : variant === 'danger' ? theme.danger : theme.muted;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: primary ? theme.accent : 'transparent',
          borderColor: outline,
          opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
        },
      ]}
    >
      <Text style={[styles.label, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 18, fontWeight: '600', textAlign: 'center' },
});

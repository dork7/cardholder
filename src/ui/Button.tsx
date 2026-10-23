import { Pressable, StyleSheet } from 'react-native';
import { Text } from './Text';
import { TYPE, useTheme } from './theme';

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
  // Green is for the primary action only; a secondary button is white text in a grey outline.
  const labelColor = primary ? theme.onAccent : variant === 'danger' ? theme.danger : theme.text;
  // The outline is what shows where a transparent button is, so it needs 3:1 against the page
  // (hairline `border` is far too faint for that): mid grey for secondary, red for danger.
  const outline = primary ? theme.accent : variant === 'danger' ? theme.danger : theme.rosette;
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
      <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 9999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Uppercase with wide tracking: the buttons' label voice, distinct from content text.
  label: { fontSize: TYPE.secondary, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', textAlign: 'center' },
});

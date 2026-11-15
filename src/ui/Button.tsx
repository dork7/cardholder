import { Pressable, StyleSheet } from 'react-native';
import { Text } from './Text';
import { RADIUS, TYPE, useTheme } from './theme';
import { RetroIcon, RetroIconName } from './RetroIcon';

export interface ButtonProps {
  icon?: RetroIconName;
  label: string;
  onPress: () => void;
  onLongPress?: () => void; // e.g. an action that must be held, so a stray tap can't trigger it
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  testID?: string;
  accessibilityLabel?: string; // when the label alone doesn't say what it acts on ("Delete" in a list)
  accessibilityHint?: string;
}

export function Button({ icon, label, onPress, onLongPress, variant = 'primary', disabled = false, testID, accessibilityLabel, accessibilityHint }: ButtonProps) {
  const theme = useTheme();
  const primary = variant === 'primary';
  // The filled ink is for the primary action only; a secondary button is white text in a grey outline.
  const labelColor = primary ? theme.onAccent : variant === 'danger' ? theme.danger : theme.text;
  // The outline is what shows where a transparent button is, so it needs 3:1 against the page
  // (hairline `border` is far too faint for that): mid grey for secondary, red for danger.
  const outline = primary ? theme.accent : variant === 'danger' ? theme.danger : theme.rosette;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={800}
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
      {icon && <RetroIcon name={icon} size={24} color={primary ? labelColor : undefined} backgroundColor={primary ? theme.accent : undefined} />}
      <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Sentence case at body size, semibold: weight, not capitals, sets a label apart from content.
  label: { flexShrink: 1, fontSize: TYPE.body, fontWeight: '600', textAlign: 'center' },
});

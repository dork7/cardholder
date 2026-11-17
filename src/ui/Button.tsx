import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { Text } from './Text';
import { RADIUS, TYPE, useTheme } from './theme';
import { RetroIcon, RetroIconName } from './RetroIcon';

// How long a button with onLongPress must be held before it acts.
export const HOLD_MS = 800;

export interface ButtonProps {
  icon?: RetroIconName;
  label: string;
  onPress: () => void;
  // An action that must be held, so a stray tap can't trigger it. While held the button fills from
  // the left, full when it acts; letting go early drains it.
  onLongPress?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  testID?: string;
  accessibilityLabel?: string; // when the label alone doesn't say what it acts on ("Delete" in a list)
  accessibilityHint?: string;
}

export function Button({ icon, label, onPress, onLongPress, variant = 'primary', disabled = false, testID, accessibilityLabel, accessibilityHint }: ButtonProps) {
  const theme = useTheme();
  const primary = variant === 'primary';
  // Primary actions use the blue fill; secondary actions sit on a translucent surface.
  const labelColor = primary ? theme.onAccent : variant === 'danger' ? theme.danger : theme.text;
  // The outline is what shows where a transparent button is, so it needs 3:1 against the page
  // (hairline `border` is far too faint for that): mid grey for secondary, red for danger.
  const outline = primary ? theme.accent : variant === 'danger' ? theme.danger : theme.rosette;
  const reduceMotion = useReducedMotion();
  const hold = useSharedValue(0);
  const fill = useAnimatedStyle(() => ({ width: `${hold.value * 100}%` }));
  const fillColor = primary ? theme.onAccent : variant === 'danger' ? theme.danger : theme.accent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={HOLD_MS}
      onPressIn={() => {
        if (onLongPress && !reduceMotion) hold.value = withTiming(1, { duration: HOLD_MS, easing: Easing.linear });
      }}
      onPressOut={() => {
        if (onLongPress) hold.value = withTiming(0, { duration: reduceMotion ? 0 : 150 });
      }}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: primary ? theme.accent : theme.glassStrong,
          borderColor: outline,
          opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
        },
      ]}
    >
      {/* Inset 1 px top highlight (React Native has no inset shadow). */}
      <View pointerEvents="none" style={[styles.highlight, { backgroundColor: primary ? 'rgba(255, 255, 255, 0.21)' : 'rgba(255, 255, 255, 0.35)' }]} />
      {onLongPress && <Animated.View style={[styles.fill, { backgroundColor: fillColor }, fill]} pointerEvents="none" testID={testID && `${testID}-fill`} />}
      {icon && <RetroIcon name={icon} size={24} color={primary ? labelColor : undefined} />}
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
    borderRadius: RADIUS.control,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden', // clips the hold fill to the button
  },
  highlight: { position: 'absolute', top: 0, start: 0, end: 0, height: 1 },
  fill: { position: 'absolute', top: 0, bottom: 0, start: 0, opacity: 0.45 },
  // Sentence case at body size, semibold: weight, not capitals, sets a label apart from content.
  label: { flexShrink: 1, fontSize: TYPE.body, fontWeight: '600', textAlign: 'center' },
});

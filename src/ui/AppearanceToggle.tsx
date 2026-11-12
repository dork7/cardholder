import { Pressable, StyleSheet } from 'react-native';
import { RetroIcon } from './RetroIcon';
import { useApp } from '../app/AppProvider';
import { strings } from '../strings';
import { nextAppearance } from './appearance';
import { useTheme } from './theme';
import { useTooltip } from './Tooltip';

// Cycles System → Light → Dark. The icon shows the current choice, not the one a tap leads to.
export function AppearanceToggle() {
  const { appearance, setAppearance } = useApp();
  const theme = useTheme();
  const { ref, onLongPress, tooltip } = useTooltip(`${strings.home.appearance}: ${strings.home.appearances[appearance]}`);
  const change = () =>
    setAppearance(nextAppearance(appearance)).catch((e) => console.warn('Saving appearance failed', e));

  return (
    <Pressable
      ref={ref}
      onPress={change}
      onLongPress={onLongPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={strings.home.appearance}
      accessibilityValue={{ text: strings.home.appearances[appearance] }}
      accessibilityHint={strings.home.appearanceHint}
      testID="appearance-toggle"
      style={({ pressed }) => [styles.button, { borderColor: theme.border, opacity: pressed ? 0.6 : 1 }]}
    >
      <RetroIcon name="appearance" size={24} appearance={appearance} />
      {tooltip}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

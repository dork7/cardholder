import { Pressable, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useApp } from '../app/AppProvider';
import { strings } from '../strings';
import { AppearancePref, nextAppearance } from './appearance';
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
      <Icon pref={appearance} color={theme.text} />
      {tooltip}
    </Pressable>
  );
}

function Icon({ pref, color }: { pref: AppearancePref; color: string }) {
  const stroke = { stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      {pref === 'system' && (
        <>
          <Circle cx={12} cy={12} r={8} {...stroke} />
          <Path d="M12 4a8 8 0 0 1 0 16z" fill={color} />
        </>
      )}
      {pref === 'light' && (
        <>
          <Circle cx={12} cy={12} r={4} {...stroke} />
          <Path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" {...stroke} />
        </>
      )}
      {pref === 'dark' && <Path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" {...stroke} />}
    </Svg>
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

import Animated, { useReducedMotion } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { CSS_EASE_OUT } from './motion';
import { useTheme } from './theme';

const POP = { from: { opacity: 0, transform: [{ scale: 0.9 }] }, to: { opacity: 1, transform: [{ scale: 1 }] } };
const FADE = { from: { opacity: 0 }, to: { opacity: 1 } };

// A compact clock from the prototype's outline vocabulary, on a solid disc so it
// remains visible over arbitrary document photos.
export function ExpiryAlert({ size = 20, testID, pop = false }: { size?: number; testID?: string; pop?: boolean }) {
  const reduced = useReducedMotion();
  const theme = useTheme();
  const icon = (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}
      importantForAccessibility="no-hide-descendants" testID={testID}>
      <Circle cx={12} cy={12} r={11} fill={theme.danger} />
      <Circle cx={12} cy={12} r={7.5} fill="none" stroke={theme.onAccent} strokeWidth={1.5} />
      <Path d="M12 7.5v4.8l3 2" fill="none" stroke={theme.onAccent} strokeWidth={1.8}
        strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
  if (!pop) return icon;
  return (
    <Animated.View style={{ animationName: reduced ? FADE : POP, animationDuration: 240, animationTimingFunction: CSS_EASE_OUT }}>
      {icon}
    </Animated.View>
  );
}

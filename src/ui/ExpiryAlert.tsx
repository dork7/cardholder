import { useMemo } from 'react';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import Svg, { Rect } from 'react-native-svg';
import { CSS_EASE_OUT } from './motion';
import { logoRects } from './PixelLogo';
import { useTheme } from './theme';

// An 8-bit warning sign, like the app's mark: a red triangle with a white "!" and a hard pixel shadow,
// so it reads on any card photo. Shown on a card that is expiring soon or has expired (needsExpiryAlert).
export const ALERT_PIXELS = [
  '.....rr.....',
  '....rrrr....',
  '....rwwrs...',
  '...rrwwrrs..',
  '...rrwwrrs..',
  '..rrrwwrrrs.',
  '..rrrwwrrrs.',
  '.rrrrrrrrrrs',
  '.rrrrwwrrrrs',
  'rrrrrwwrrrrr',
  'rrrrrrrrrrrr',
  '.sssssssssss',
];

type Pixel = 'r' | 'w' | 's';

// Grows in from slightly small as it first appears; with reduced motion it only fades in. Not
// used on tiles in scrolling lists, where it would replay every time a row is recycled.
const POP = { from: { opacity: 0, transform: [{ scale: 0.9 }] }, to: { opacity: 1, transform: [{ scale: 1 }] } };
const FADE = { from: { opacity: 0 }, to: { opacity: 1 } };

export function ExpiryAlert({ size = 20, testID, pop = false }: { size?: number; testID?: string; pop?: boolean }) {
  const reduced = useReducedMotion();
  const theme = useTheme();
  const rects = useMemo(() => logoRects<Pixel>(ALERT_PIXELS), []);
  const fill: Record<Pixel, string> = { r: theme.danger, w: '#FFFFFF', s: 'rgba(0, 0, 0, 0.55)' };
  const grid = ALERT_PIXELS.length;
  const icon = (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${grid} ${grid}`}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      testID={testID}
    >
      {rects.map((r) => (
        <Rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.width} height={1} fill={fill[r.pixel]} />
      ))}
    </Svg>
  );
  if (!pop) return icon;
  return (
    <Animated.View
      style={{ animationName: reduced ? FADE : POP, animationDuration: 240, animationTimingFunction: CSS_EASE_OUT }}
    >
      {icon}
    </Animated.View>
  );
}

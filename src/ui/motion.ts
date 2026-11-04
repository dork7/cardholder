import { cubicBezier, Easing } from 'react-native-reanimated';

// Strong ease-out for anything entering or leaving: fast at the start, where the eye is.
export const CSS_EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

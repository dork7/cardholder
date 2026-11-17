import { cubicBezier, Easing, FadeInDown } from 'react-native-reanimated';

// Strong ease-out for anything entering or leaving: fast at the start, where the eye is.
export const CSS_EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

// Every screen's content fades and rises in over 0.4 s with the prototype's cubic-bezier(.2,.8,.2,1).
export const ENTRANCE = FadeInDown.duration(400).easing(Easing.bezier(0.2, 0.8, 0.2, 1));

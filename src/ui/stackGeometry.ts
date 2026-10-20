// Geometry and gesture rules for the wallet-style card stack on the home screen.
// Pure functions so they can run as worklets on the UI thread and be unit tested.

export const PEEK = 46; // top strip of each card behind the front one
export const MAX_VISIBLE = 4; // front card + 3 peeking strips
export const COMMIT_PX = 72; // drag distance that commits a swipe
export const COMMIT_V = 500; // flick velocity (pt/s) that commits a swipe
export const TAP_SLOP = 6; // movement below this is a tap, not a drag
export const ID1_RATIO = 1.586; // ISO/IEC 7810 ID-1
export const ID1_RADIUS = 0.037; // corner radius as a fraction of card width
const SCALE_STEP = 0.045; // each layer back is slightly narrower

export interface Pose {
  ty: number;
  scale: number;
  opacity: number;
  z: number;
}

export interface StackGeometry {
  cardW: number;
  cardH: number;
  visible: number;
  frontTop: number; // y of the front card's top edge inside the stack
  height: number;
  fly: number; // how far a leaving card travels before it is re-queued
}

export function stackGeometry(width: number, n: number): StackGeometry {
  const cardW = width;
  const cardH = width / ID1_RATIO;
  const visible = Math.max(1, Math.min(n, MAX_VISIBLE));
  const frontTop = PEEK * (visible - 1);
  return { cardW, cardH, visible, frontTop, height: frontTop + cardH, fly: cardH * 0.7 };
}

export function mod(a: number, n: number): number {
  'worklet';
  return ((a % n) + n) % n;
}

export function restingPose(k: number, n: number): Pose {
  'worklet';
  return { ty: 0 - PEEK * k, scale: 1 - SCALE_STEP * k, opacity: k < MAX_VISIBLE ? 1 : 0, z: n - k };
}

const lerp = (a: number, b: number, t: number) => {
  'worklet';
  return a + (b - a) * t;
};

// Pose of card i while the stack moves `steps` cards forward from `from`, at progress f (0..1).
// Cards in front of the target fly out along the exit direction during the first half, then
// reappear at their back slot and fade in during the second half; the rest slide forward in the
// first half. f = 0 is the resting pose of `from`, f = 1 the resting pose of `from + steps`, so
// running f backwards from 1 to 0 brings the previous card back in from below.
export function cardPose(i: number, n: number, from: number, steps: number, f: number, fly: number): Pose {
  'worklet';
  const k0 = mod(i - from, n);
  if (n < 2 || steps === 0 || f <= 0) return restingPose(k0, n);
  if (k0 < steps) {
    const start = restingPose(k0, n);
    if (f < 0.5) {
      const u = f * 2;
      return {
        ty: lerp(start.ty, fly, u),
        scale: lerp(start.scale, 1, u),
        opacity: start.opacity * (1 - u * u),
        z: 2 * n - k0, // leaving cards pass in front of everything
      };
    }
    const end = restingPose(k0 - steps + n, n);
    return { ...end, opacity: end.opacity * (f * 2 - 1) };
  }
  const start = restingPose(k0, n);
  const end = restingPose(k0 - steps, n);
  const h = Math.min(1, f * 2);
  return {
    ty: lerp(start.ty, end.ty, h),
    scale: lerp(start.scale, end.scale, h),
    opacity: lerp(start.opacity, end.opacity, h),
    z: end.z,
  };
}

// The front card follows the finger, resisting a little the further it travels.
export function rubberBand(d: number): number {
  'worklet';
  return Math.sign(d) * Math.pow(Math.abs(d), 0.92);
}

// Downward drag mapped to progress, so the front card tracks the finger exactly.
export function dragProgress(dy: number, fly: number): number {
  'worklet';
  if (dy <= 0 || fly <= 0) return 0;
  return Math.min(rubberBand(dy) / (2 * fly), 0.5);
}

// +1 sends the front card away, -1 brings the previous one back, 0 springs back.
export function releaseAction(dy: number, vy: number): 1 | -1 | 0 {
  'worklet';
  if (dy >= COMMIT_PX || vy >= COMMIT_V) return 1;
  if (dy <= -COMMIT_PX || vy <= -COMMIT_V) return -1;
  return 0;
}

// Which slot a tap at height y lands on: the front card, or one of the strips above it.
export function slotAtY(y: number, geo: Pick<StackGeometry, 'frontTop' | 'visible'>): number {
  'worklet';
  if (y >= geo.frontTop) return 0;
  return Math.min(Math.ceil((geo.frontTop - y) / PEEK), geo.visible - 1);
}

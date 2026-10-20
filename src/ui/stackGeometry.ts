// Geometry and gesture rules for the wallet-style card stack on the home screen.
// The pile fans out to the right of the front card; swiping left sends the front card away,
// swiping right brings the previous one back.
// Pure functions so they can run as worklets on the UI thread and be unit tested.

export const PEEK = 26; // right-edge strip of each card behind the front one
export const MAX_VISIBLE = 4; // front card + 3 peeking strips
export const COMMIT_PX = 72; // drag distance that commits a swipe
export const COMMIT_V = 500; // flick velocity (pt/s) that commits a swipe
export const TAP_SLOP = 6; // movement below this is a tap, not a drag
export const ID1_RATIO = 1.586; // ISO/IEC 7810 ID-1
export const ID1_RADIUS = 0.037; // corner radius as a fraction of card width
const SCALE_STEP = 0.045; // each layer back is slightly smaller
const EXIT_TILT = -8; // degrees a leaving card has turned by the time it is gone

export interface Pose {
  tx: number;
  rotate: number; // degrees
  scale: number;
  opacity: number;
  z: number;
}

export interface StackGeometry {
  cardW: number;
  cardH: number;
  visible: number;
  height: number;
  fly: number; // how far a leaving card travels before it is re-queued
}

// The front card shrinks so the fanned strips stay inside `width`.
export function stackGeometry(width: number, n: number): StackGeometry {
  const visible = Math.max(1, Math.min(n, MAX_VISIBLE));
  const cardW = Math.max(0, width - PEEK * (visible - 1));
  const cardH = cardW / ID1_RATIO;
  return { cardW, cardH, visible, height: cardH, fly: cardW * 0.7 };
}

export function mod(a: number, n: number): number {
  'worklet';
  return ((a % n) + n) % n;
}

export function restingPose(k: number, n: number): Pose {
  'worklet';
  return { tx: PEEK * k, rotate: 0, scale: 1 - SCALE_STEP * k, opacity: k < MAX_VISIBLE ? 1 : 0, z: n - k };
}

const lerp = (a: number, b: number, t: number) => {
  'worklet';
  return a + (b - a) * t;
};

// Pose of card i while the stack moves `steps` cards forward from `from`, at progress f (0..1).
// Cards in front of the target fly out to the left during the first half, then reappear at
// their back slot and fade in during the second half; the rest slide forward in the first half.
// f = 0 is the resting pose of `from`, f = 1 the resting pose of `from + steps`, so running f
// backwards from 1 to 0 brings the previous card back in from the left.
export function cardPose(i: number, n: number, from: number, steps: number, f: number, fly: number): Pose {
  'worklet';
  const k0 = mod(i - from, n);
  if (n < 2 || steps === 0 || f <= 0) return restingPose(k0, n);
  if (k0 < steps) {
    const start = restingPose(k0, n);
    if (f < 0.5) {
      const u = f * 2;
      return {
        tx: lerp(start.tx, -fly, u),
        rotate: EXIT_TILT * u,
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
    tx: lerp(start.tx, end.tx, h),
    rotate: 0,
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

// Leftward drag mapped to progress, so the front card tracks the finger exactly.
export function dragProgress(dx: number, fly: number): number {
  'worklet';
  if (dx >= 0 || fly <= 0) return 0;
  return Math.min(rubberBand(-dx) / (2 * fly), 0.5);
}

// +1 sends the front card away (left), -1 brings the previous one back (right), 0 springs back.
export function releaseAction(dx: number, vx: number): 1 | -1 | 0 {
  'worklet';
  if (dx <= -COMMIT_PX || vx <= -COMMIT_V) return 1;
  if (dx >= COMMIT_PX || vx >= COMMIT_V) return -1;
  return 0;
}

// Which slot a tap at x lands on: the front card, or one of the strips to its right.
export function slotAtX(x: number, geo: Pick<StackGeometry, 'cardW' | 'visible'>): number {
  'worklet';
  if (x <= geo.cardW) return 0;
  return Math.min(Math.ceil((x - geo.cardW) / PEEK), geo.visible - 1);
}

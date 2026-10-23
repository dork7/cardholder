import { useMemo } from 'react';
import Svg, { Path } from 'react-native-svg';

// A guilloche rosette — the fine-line pattern printed on IDs and banknotes —
// drawn as a few slightly rotated epitrochoids.
const R = 10;
const r = 3;
const d = 5;
const STEPS = 900;
const LINES = 6;

export function rosettePath(size: number, rotation: number): string {
  const centre = size / 2;
  const scale = centre / (R + r + d);
  const k = (R + r) / r;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  let path = '';
  for (let i = 0; i <= STEPS; i++) {
    const t = (i / STEPS) * 2 * Math.PI * r; // R and r are coprime, so the curve closes after r turns
    const x = (R + r) * Math.cos(t) - d * Math.cos(k * t);
    const y = (R + r) * Math.sin(t) - d * Math.sin(k * t);
    const px = (centre + (x * cos - y * sin) * scale).toFixed(2);
    const py = (centre + (x * sin + y * cos) * scale).toFixed(2);
    path += `${i === 0 ? 'M' : 'L'}${px} ${py}`;
  }
  return `${path}Z`;
}

export function Rosette({ size, color }: { size: number; color: string }) {
  const paths = useMemo(
    () => Array.from({ length: LINES }, (_, i) => rosettePath(size, (i * Math.PI) / 39)),
    [size],
  );
  return (
    <Svg width={size} height={size} accessible={false} importantForAccessibility="no-hide-descendants">
      {paths.map((path, i) => (
        <Path key={i} d={path} stroke={color} strokeWidth={0.75} fill="none" />
      ))}
    </Svg>
  );
}

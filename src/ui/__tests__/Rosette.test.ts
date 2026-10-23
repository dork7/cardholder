import { rosettePath } from '../Rosette';

const points = (d: string) =>
  d.replace(/Z$/, '').slice(1).split('L').map((p) => p.split(' ').map(Number));

test('the rosette is a closed curve inside its box', () => {
  const pts = points(rosettePath(200, 0));
  expect(pts[0]).toEqual(pts[pts.length - 1]);
  for (const [x, y] of pts) {
    expect(x).toBeGreaterThanOrEqual(0);
    expect(x).toBeLessThanOrEqual(200);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(y).toBeLessThanOrEqual(200);
  }
});

test('rotation changes the curve', () => {
  expect(rosettePath(200, 0.1)).not.toBe(rosettePath(200, 0));
});

import { LOGO_PIXELS, logoRects } from '../PixelLogo';

test('the logo is a square grid of known pixels', () => {
  for (const row of LOGO_PIXELS) {
    expect(row).toHaveLength(LOGO_PIXELS.length);
    expect(row).toMatch(/^[.oplas]+$/);
  }
});

test('runs of one colour on a row become one rect, and empty pixels none', () => {
  expect(logoRects(['..oo.a', 'pppppp'])).toEqual([
    { x: 2, y: 0, width: 2, pixel: 'o' },
    { x: 5, y: 0, width: 1, pixel: 'a' },
    { x: 0, y: 1, width: 6, pixel: 'p' },
  ]);
});

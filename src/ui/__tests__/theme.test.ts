import { palettes, Theme } from '../theme';

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// The opaque layers text can sit on: the page and each lifted surface.
const surfaces = (t: Theme) => ({ bg: t.bg, surface: t.surface, bannerBg: t.bannerBg });

describe.each(Object.entries(palettes))('%s palette', (_, t) => {
  test.each(Object.entries(surfaces(t)))('body and secondary text reach 4.5:1 on %s', (_, ground) => {
    expect(contrast(t.text, ground)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t.muted, ground)).toBeGreaterThanOrEqual(4.5);
  });

  test('button labels reach 4.5:1 on the filled accent', () => {
    expect(contrast(t.onAccent, t.accent)).toBeGreaterThanOrEqual(4.5);
  });

  test('destructive text reaches 4.5:1 on the page', () => {
    expect(contrast(t.danger, t.bg)).toBeGreaterThanOrEqual(4.5);
  });

  test('the filled accent stands out from the page by 3:1', () => {
    expect(contrast(t.accent, t.bg)).toBeGreaterThanOrEqual(3);
  });
});

test('dark mode uses off-white text and lifts surfaces with lighter greys', () => {
  const { dark } = palettes;
  expect(dark.text).not.toBe('#FFFFFF');
  expect(luminance(dark.surface)).toBeGreaterThan(luminance(dark.bg));
  expect(luminance(dark.bannerBg)).toBeGreaterThan(luminance(dark.surface));
});

import { useMemo } from 'react';
import Svg, { Rect } from 'react-native-svg';
import { Theme } from './theme';

// The app's mark, 8-bit style: a document with a folded corner, lines of text and an amber seal,
// with a hard pixel shadow. Each character is one pixel; '.' is empty.
export const LOGO_PIXELS = [
  '..ooooooooo.....',
  '..opppppppoo....',
  '..opppppppoao...',
  '..opppppppoaao..',
  '..opppppppooooo.',
  '..opppppppppppos',
  '..opllllllllppos',
  '..opppppppppppos',
  '..opllllllppppos',
  '..opppppppppppos',
  '..opllllpaaappos',
  '..oppppppaaappos',
  '..oppppppapappos',
  '..opppppppppppos',
  '..ooooooooooooos',
  '...sssssssssssss',
];

type Pixel = 'o' | 'p' | 'l' | 'a' | 's';

const colours = (theme: Theme): Record<Pixel, string> => ({
  o: theme.text, // outline
  p: theme.bannerBg, // paper
  l: theme.muted, // text lines
  a: theme.accent, // seal
  s: theme.rosette, // shadow
});

// Runs of the same colour on a row become one rect, so the mark is a few dozen shapes, not hundreds.
export function logoRects(pixels: readonly string[]): { x: number; y: number; width: number; pixel: Pixel }[] {
  const rects: { x: number; y: number; width: number; pixel: Pixel }[] = [];
  pixels.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const pixel = row[x];
      let end = x + 1;
      while (row[end] === pixel) end++;
      if (pixel !== '.') rects.push({ x, y, width: end - x, pixel: pixel as Pixel });
      x = end;
    }
  });
  return rects;
}

export function PixelLogo({ size, theme }: { size: number; theme: Theme }) {
  const rects = useMemo(() => logoRects(LOGO_PIXELS), []);
  const fill = colours(theme);
  const grid = LOGO_PIXELS.length;
  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${grid} ${grid}`}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      {rects.map((r) => (
        <Rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.width} height={1} fill={fill[r.pixel]} />
      ))}
    </Svg>
  );
}

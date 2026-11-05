// Draws the app icons from the same 8-bit mark the app shows (LOGO_PIXELS in src/ui/PixelLogo.tsx),
// so the launcher icon and the in-app logo never drift apart. Run: node scripts/make-icons.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const root = new URL('..', import.meta.url);
const source = readFileSync(new URL('src/ui/PixelLogo.tsx', root), 'utf8');
const block = source.match(/LOGO_PIXELS = \[([\s\S]*?)\]/)[1];
const PIXELS = [...block.matchAll(/'([^']+)'/g)].map((m) => m[1]);

// The dark palette from src/ui/theme.ts.
const BG = '#121212';
const COLOURS = { o: '#FDFDFD', p: '#1F1F1F', l: '#B3B3B3', a: '#F5B83D', s: '#7C7C7C' };
const WHITE = '#FFFFFF';

const rgba = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).concat(255);

// The mark's drawn area, so it can be centred on what's visible rather than on the 16x16 grid.
const cells = PIXELS.flatMap((row, y) => [...row].map((c, x) => ({ x, y, c }))).filter((p) => p.c !== '.');
const minX = Math.min(...cells.map((p) => p.x));
const maxX = Math.max(...cells.map((p) => p.x));
const minY = Math.min(...cells.map((p) => p.y));
const maxY = Math.max(...cells.map((p) => p.y));

// size: canvas px; cell: px per logo pixel (whole numbers keep edges crisp);
// bg: canvas colour or null for transparent; fill(c): colour of a logo pixel or null to skip it.
function draw({ size, cell, bg, fill }) {
  const buf = Buffer.alloc(size * size * 4);
  if (bg) for (let i = 0; i < size * size; i++) buf.set(rgba(bg), i * 4);
  const ox = Math.round((size - (maxX - minX + 1) * cell) / 2) - minX * cell;
  const oy = Math.round((size - (maxY - minY + 1) * cell) / 2) - minY * cell;
  for (const { x, y, c } of cells) {
    const colour = fill(c);
    if (!colour) continue;
    for (let py = 0; py < cell; py++) {
      for (let px = 0; px < cell; px++) {
        buf.set(rgba(colour), ((oy + y * cell + py) * size + ox + x * cell + px) * 4);
      }
    }
  }
  return png(size, buf);
}

function png(size, pixels) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 6, 0, 0, 0], 8); // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function crc32(bytes) {
  let c = ~0;
  for (const b of bytes) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}

const colour = (c) => COLOURS[c];
const out = (name, data) => writeFileSync(new URL(`assets/${name}`, root), data);

// iOS and the store listing: full-bleed dark square; the OS rounds the corners.
out('icon.png', draw({ size: 1024, cell: 44, bg: BG, fill: colour }));
// Android adaptive icon: the mark stays inside the 66/108 safe circle every launcher mask keeps.
out('android-icon-foreground.png', draw({ size: 512, cell: 14, bg: null, fill: colour }));
out('android-icon-background.png', draw({ size: 512, cell: 1, bg: BG, fill: () => null }));
// Themed (Material You) icons use only the alpha: keep the ink, let the paper show through.
out('android-icon-monochrome.png', draw({ size: 432, cell: 12, bg: null, fill: (c) => (c === 'p' ? null : WHITE) }));
out('splash-icon.png', draw({ size: 1024, cell: 32, bg: null, fill: colour }));
out('favicon.png', draw({ size: 48, cell: 3, bg: BG, fill: colour }));

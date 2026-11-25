// Draws the app icons: a fan of wallet cards on near-black. Run: node scripts/make-icons.mjs
// Everything is rounded rectangles, rasterised here with 4x4 supersampling so no image tools are needed.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const root = new URL('..', import.meta.url);

// Design space is 400x400. Each card: x, y, width, height, radius, colour.
const BG = '#16161D';
const CARDS = [
  { y: 95, h: 150, c: '#3442E6' },
  { y: 135, h: 150, c: '#6B77F0' },
  { y: 175, h: 145, c: '#A7B3FF' },
  { y: 215, h: 105, c: '#FFFFFF' },
].map((card) => ({ ...card, x: 80, w: 240, r: 24 }));
// Two lines of "text" on the front card.
const LINES = [
  { x: 108, y: 245, w: 110, h: 14, r: 7, c: '#C9CEE8' },
  { x: 108, y: 272, w: 70, h: 14, r: 7, c: '#C9CEE8' },
];
// The mark's centre in design space, so it can be centred on the canvas.
const CENTRE = { x: 200, y: 207.5 };
const GAP = 7; // transparent gap between cards in the themed (single-colour) icon

const rgba = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

function inside(shape, px, py, grow = 0) {
  const x = shape.x - grow, y = shape.y - grow, w = shape.w + 2 * grow, h = shape.h + 2 * grow, r = shape.r + grow;
  if (px < x || px > x + w || py < y || py > y + h) return false;
  const cx = Math.min(Math.max(px, x + r), x + w - r);
  const cy = Math.min(Math.max(py, y + r), y + h - r);
  return (px - cx) ** 2 + (py - cy) ** 2 <= r * r;
}

// size: canvas px; scale: canvas px per design unit; bg: colour or null (transparent);
// mono: draw a single colour with transparent gaps instead of the coloured cards;
// plate: draw a rounded dark square behind the mark (radius in design units) instead of a flat bg.
function draw({ size, scale, bg, mono = false, plate = null, flat = false }) {
  const buf = Buffer.alloc(size * size * 4);
  const SS = 4;
  // Canvas pixel -> design space, with the mark's centre on the canvas centre.
  const toX = (v) => (v - size / 2) / scale + CENTRE.x;
  const toY = (v) => (v - size / 2) / scale + CENTRE.y;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = toX(x + (sx + 0.5) / SS);
          const py = toY(y + (sy + 0.5) / SS);
          let colour = null;
          if (bg) colour = rgba(bg);
          if (plate && inside({ x: CENTRE.x - 200, y: CENTRE.y - 200, w: 400, h: 400, r: plate }, px, py)) colour = rgba(BG);
          if (flat) {
            // flat colour only, no mark
          } else if (mono) {
            for (const card of CARDS) {
              if (colour && inside(card, px, py, GAP)) colour = null;
              if (inside(card, px, py)) colour = [255, 255, 255];
            }
            for (const line of LINES) if (inside(line, px, py)) colour = null;
          } else {
            for (const card of CARDS) if (inside(card, px, py)) colour = rgba(card.c);
            for (const line of LINES) if (inside(line, px, py)) colour = rgba(line.c);
          }
          if (colour) {
            r += colour[0]; g += colour[1]; b += colour[2]; a += 255;
          }
        }
      }
      const n = SS * SS;
      const i = (y * size + x) * 4;
      const cover = a / 255; // number of covered samples
      buf[i] = cover ? Math.round(r / cover) : 0;
      buf[i + 1] = cover ? Math.round(g / cover) : 0;
      buf[i + 2] = cover ? Math.round(b / cover) : 0;
      buf[i + 3] = Math.round((cover / n) * 255);
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

const out = (name, data) => writeFileSync(new URL(`assets/${name}`, root), data);

// iOS and the store listing: full-bleed near-black square; the OS rounds the corners.
out('icon.png', draw({ size: 1024, scale: 1024 / 400, bg: BG }));
// Android adaptive icon: the mark stays inside the 66/108 safe circle every launcher mask keeps.
out('android-icon-foreground.png', draw({ size: 512, scale: 0.9, bg: null }));
out('android-icon-background.png', draw({ size: 512, scale: 1, bg: BG, flat: true }));
// Themed (Material You) icons use only the alpha: white cards with transparent gaps between them.
out('android-icon-monochrome.png', draw({ size: 432, scale: 0.78, bg: null, mono: true }));
// Splash: the whole icon as a rounded plate, so it reads on any splash background.
out('splash-icon.png', draw({ size: 1024, scale: 1024 / 400 * 0.8, bg: null, plate: 92 }));
out('favicon.png', draw({ size: 48, scale: 48 / 400, bg: BG }));

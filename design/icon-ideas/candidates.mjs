// Pixel-art app icon candidates, drawn on the same 16x16 grid and palette as the current mark
// (src/ui/PixelLogo.tsx). Run: node design/icon-ideas/candidates.mjs
// Writes <name>.png (1024px, as iOS would show it) and sheet.png (all of them side by side).
import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const root = new URL('../..', import.meta.url);
const here = new URL('.', import.meta.url);
const current = readFileSync(new URL('src/ui/PixelLogo.tsx', root), 'utf8').match(/LOGO_PIXELS = \[([\s\S]*?)\]/)[1];

const BG = '#121212';
const COLOURS = { o: '#FDFDFD', p: '#1F1F1F', l: '#B3B3B3', a: '#F5B83D', s: '#7C7C7C', b: '#B07A1A' };

const CANDIDATES = {
  // '.' background, o white outline, p dark panel, l grey lines, a amber, s shadow, b darker amber
  '0-current': [...current.matchAll(/'([^']+)'/g)].map((m) => m[1]),
  '1-id-card': [
    '................',
    '................',
    '................',
    '.oooooooooooooo.',
    '.oppppppppppppos',
    '.opaaaappllllpos',
    '.opaaaapppppppos',
    '.opaaaapplllppos',
    '.opaaaapppppppos',
    '.oppppppppppppos',
    '.opllllllllpppos',
    '.oppppppppppppos',
    '.oooooooooooooos',
    '..ssssssssssssss',
    '................',
    '................',
  ],
  '2-folder': [
    '................',
    '................',
    '..oooooo........',
    '..oaaaaao.......',
    '..oaaaaaooooooo.',
    '..oaaaaaaaaaaaao',
    '..oaaaaaaaaaaaao',
    '..oaappppppppaao',
    '..oaapllllllpaao',
    '..oaappppppppaao',
    '..oaapllllllpaao',
    '..oaappppppppaao',
    '..oaaaaaaaaaaaao',
    '..oooooooooooooo',
    '...sssssssssssss',
    '................',
  ],
  '3-locked-card': [
    '................',
    '................',
    '.oooooooooooooo.',
    '.oppppppppppppos',
    '.opppppoooppppps',
    '.oppppopppopppps',
    '.oppppopppopppps',
    '.opppaaaaaaappps',
    '.opppaaapaaappps',
    '.opppaaapaaappps',
    '.opppaaaaaaappps',
    '.opppaaaaaaappps',
    '.oppppppppppppos',
    '.oooooooooooooos',
    '..ssssssssssssss',
    '................',
  ],
  '4-shield': [
    '................',
    '..oooooooooooo..',
    '..oaaaaaaaaaao..',
    '..oaaaaaaaaaao..',
    '..oaappppppaao..',
    '..oaaplllllpao..',
    '..oaappppppaao..',
    '..oaaplllllpao..',
    '..oaappppppaao..',
    '...oaaaaaaaao...',
    '...oaaaaaaaao...',
    '....oaaaaaao....',
    '.....oaaaao.....',
    '......oaao......',
    '.......oo.......',
    '................',
  ],
  '5-stack': [
    '................',
    '................',
    '.....oooooooooo.',
    '.....oppppppppo.',
    '...oooooooooopo.',
    '...oppppppppopo.',
    '.oooooooooopopo.',
    '.oppppppppopopo.',
    '.oplllllppopooo.',
    '.opppppaaaopo...',
    '.opllllaaaooo...',
    '.opppppaaao.....',
    '.oppppppppo.....',
    '.oooooooooo.....',
    '................',
    '................',
  ],
  '6-vault': [
    '................',
    '.oooooooooooooo.',
    '.oppppppppppppos',
    '.opllllllllllpos',
    '.oplpppppppplpos',
    '.oplpppaaapplpos',
    '.oplppaaaaaplpos',
    '.oplppaapaaplpos',
    '.oplppaaaaaplpos',
    '.oplpppaaapplpos',
    '.oplpppppppplpos',
    '.oplpppppppplpos',
    '.opllllllllllpos',
    '.oppppppppppppos',
    '.oooooooooooooos',
    '..ssssssssssssss',
  ],
};

const rgba = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).concat(255);

class Canvas {
  constructor(w, h, bg) {
    this.w = w; this.h = h; this.buf = Buffer.alloc(w * h * 4);
    for (let i = 0; i < w * h; i++) this.buf.set(rgba(bg), i * 4);
  }
  rect(x, y, w, h, hex) {
    for (let py = y; py < y + h; py++) for (let px = x; px < x + w; px++) this.buf.set(rgba(hex), (py * this.w + px) * 4);
  }
  // Draws a 16x16 grid centred on its drawn pixels in a size*size square at (x0, y0).
  mark(pixels, x0, y0, size, cell) {
    const cells = pixels.flatMap((row, y) => [...row].map((c, x) => ({ x, y, c }))).filter((p) => p.c !== '.');
    const xs = cells.map((p) => p.x), ys = cells.map((p) => p.y);
    const ox = Math.round((size - (Math.max(...xs) - Math.min(...xs) + 1) * cell) / 2) - Math.min(...xs) * cell;
    const oy = Math.round((size - (Math.max(...ys) - Math.min(...ys) + 1) * cell) / 2) - Math.min(...ys) * cell;
    for (const { x, y, c } of cells) this.rect(x0 + ox + x * cell, y0 + oy + y * cell, cell, cell, COLOURS[c]);
  }
  png() {
    const raw = Buffer.alloc(this.h * (this.w * 4 + 1));
    for (let y = 0; y < this.h; y++) this.buf.copy(raw, y * (this.w * 4 + 1) + 1, y * this.w * 4, (y + 1) * this.w * 4);
    const header = Buffer.alloc(13);
    header.writeUInt32BE(this.w, 0); header.writeUInt32BE(this.h, 4); header.set([8, 6, 0, 0, 0], 8);
    return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
  }
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function crc32(bytes) {
  let c = ~0;
  for (const b of bytes) { c ^= b; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1; }
  return ~c >>> 0;
}

for (const [name, pixels] of Object.entries(CANDIDATES)) {
  const bad = pixels.filter((r) => r.length !== 16 || /[^.oplasb]/.test(r));
  if (pixels.length !== 16 || bad.length) throw new Error(`${name}: rows must be 16 x 16 of .oplasb, got ${JSON.stringify(bad)}`);
  const c = new Canvas(1024, 1024, BG);
  c.mark(pixels, 0, 0, 1024, 44);
  writeFileSync(new URL(`${name}.png`, here), c.png());
}

// Contact sheet: each candidate as a 256px rounded-looking tile (large) and a 48px tile (launcher size).
const names = Object.keys(CANDIDATES);
const gap = 24, big = 256, small = 64;
const sheet = new Canvas(gap + names.length * (big + gap), gap + big + gap + small + gap, '#000000');
names.forEach((name, i) => {
  const x = gap + i * (big + gap);
  sheet.rect(x, gap, big, big, BG);
  sheet.mark(CANDIDATES[name], x, gap, big, 11);
  sheet.rect(x, gap + big + gap, small, small, BG);
  sheet.mark(CANDIDATES[name], x, gap + big + gap, small, 3);
});
writeFileSync(new URL('sheet.png', here), sheet.png());
console.log(`wrote ${names.length} candidates and sheet.png to design/icon-ideas/`);

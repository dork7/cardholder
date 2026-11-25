const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { inflateSync } = require('node:zlib');

const root = join(__dirname, '../..');

function png(name) {
  const data = readFileSync(join(root, 'assets', name));
  expect(data.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const size = data.readUInt32BE(16);
  expect(data.readUInt32BE(20)).toBe(size);
  expect(data[24]).toBe(8);
  expect(data[25]).toBe(6); // RGBA, needed for adaptive and themed transparency
  const chunks = [];
  for (let at = 8; at < data.length;) {
    const length = data.readUInt32BE(at);
    const kind = data.toString('ascii', at + 4, at + 8);
    if (kind === 'IDAT') chunks.push(data.subarray(at + 8, at + 8 + length));
    at += length + 12;
  }
  const pixels = inflateSync(Buffer.concat(chunks));
  const pixel = (x, y) => [...pixels.subarray(y * (size * 4 + 1) + 1 + x * 4, y * (size * 4 + 1) + 5 + x * 4)];
  return { size, pixel };
}

test('wallet fan icon outputs have the expected sizes and adaptive background', () => {
  const app = require('../../app.json').expo;
  expect(app.android.adaptiveIcon.backgroundColor).toBe('#16161D');
  for (const [file, size] of Object.entries({
    'icon.png': 1024, 'android-icon-foreground.png': 512,
    'android-icon-background.png': 512, 'android-icon-monochrome.png': 432,
    'splash-icon.png': 1024, 'favicon.png': 48,
  })) expect(png(file).size).toBe(size);
  expect(png('icon.png').pixel(0, 0)).toEqual([22, 22, 29, 255]);
  expect(png('android-icon-background.png').pixel(256, 256)).toEqual([22, 22, 29, 255]);
});

test('adaptive and themed marks leave transparent launcher corners', () => {
  for (const file of ['android-icon-foreground.png', 'android-icon-monochrome.png']) {
    const image = png(file);
    expect(image.pixel(0, 0)[3]).toBe(0);
    expect(image.pixel(Math.floor(image.size / 2), Math.floor(image.size / 2))[3]).toBeGreaterThan(0);
  }
});

import { createTransfer } from '../../transfer/frames';
import { qrPath } from '../QrCode';

test('a transfer frame fits a QR code a camera reads easily off a screen', () => {
  const frame = createTransfer(new Uint8Array(150_000).fill(7), 1).frame(300);
  const { size, d } = qrPath(frame);
  const version = (size - 17) / 4;
  expect(version).toBeLessThanOrEqual(25);
  expect(d).toMatch(/^M\d+ \d+h\d+v1h-\d+z/);
});

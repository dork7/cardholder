import { cropRect } from '../smartCrop';

test('grows the detected card by the margin and converts it to pixels', () => {
  expect(cropRect({ x: 0.2, y: 0.3, width: 0.5, height: 0.4 }, 1000, 2000, 0.1)).toEqual({
    originX: 150,
    originY: 520,
    width: 600,
    height: 960,
  });
});

test('stays inside the photo', () => {
  expect(cropRect({ x: 0, y: 0.5, width: 0.6, height: 0.5 }, 100, 100, 0.1)).toEqual({ originX: 0, originY: 45, width: 66, height: 55 });
});

test('no cut when the card already fills the photo, or the find is a speck', () => {
  expect(cropRect({ x: 0.01, y: 0.01, width: 0.98, height: 0.98 }, 100, 100)).toBeNull();
  expect(cropRect({ x: 0.5, y: 0.5, width: 0.05, height: 0.03 }, 100, 100)).toBeNull();
});

test('a photo that is already an ID is not cut down to its portrait (#57)', () => {
  // An ID card fills an 856×540 photo; the detector found the portrait box inside it.
  expect(cropRect({ x: 0.05, y: 0.2, width: 0.25, height: 0.6 }, 856, 540)).toBeNull();
  // A passport data page photo (about 1.42:1), same thing.
  expect(cropRect({ x: 0.04, y: 0.25, width: 0.22, height: 0.5 }, 1250, 880)).toBeNull();
});

test('a card found in an ordinary 4:3 or 16:9 photo is still cut out, however small', () => {
  expect(cropRect({ x: 0.3, y: 0.3, width: 0.3, height: 0.25 }, 4000, 3000)).not.toBeNull();
  expect(cropRect({ x: 0.3, y: 0.3, width: 0.3, height: 0.25 }, 1920, 1080)).not.toBeNull();
});

test('in a document-shaped photo, a large find is still used', () => {
  expect(cropRect({ x: 0.1, y: 0.1, width: 0.7, height: 0.7 }, 856, 540)).not.toBeNull();
});

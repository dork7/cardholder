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

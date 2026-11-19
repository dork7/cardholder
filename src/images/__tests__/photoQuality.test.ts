import { photoQualityProblem } from '../photoQuality';

test('only strong image-quality signals trigger a warning', () => {
  expect(photoQualityProblem({ sharpness: 12, contrast: 48, whiteRatio: 0.25, clippedLines: 0 })).toBeNull();
  expect(photoQualityProblem({ sharpness: 1, contrast: 10, whiteRatio: 0.15, clippedLines: 0 })).toBe('blur');
  expect(photoQualityProblem({ sharpness: 10, contrast: 12, whiteRatio: 0.92, clippedLines: 0 })).toBe('glare');
  expect(photoQualityProblem({ sharpness: 12, contrast: 48, whiteRatio: 0.25, clippedLines: 2 })).toBe('cutoff');
  expect(photoQualityProblem({ sharpness: 12, contrast: 48, whiteRatio: 0.25, clippedLines: 1 })).toBeNull();
});

import { familyFor, FONT } from '../Text';

test('maps weights to the bundled Public Sans files', () => {
  expect(familyFor(undefined)).toBe(FONT.regular);
  expect(familyFor('normal')).toBe(FONT.regular);
  expect(familyFor('500')).toBe(FONT.regular);
  expect(familyFor('600')).toBe(FONT.semibold);
  expect(familyFor('700')).toBe(FONT.bold);
  expect(familyFor('bold')).toBe(FONT.bold);
  expect(familyFor('900')).toBe(FONT.bold);
});

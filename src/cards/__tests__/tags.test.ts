import { makeCard } from '../../../test/fixtures';
import { strings } from '../../strings';
import { allTags, cardsWithTag, hasTag, isId, legacyCategoryTag, normalizeTags, resolveTag, tagOptions, withLegacyCategory } from '../tags';

test('tags are trimmed, deduplicated ignoring case, and blanks dropped', () => {
  expect(normalizeTags(['  Work ', 'work', '', 'Family   papers'])).toEqual(['Work', 'Family papers']);
});

test('lists every tag in use once, alphabetically', () => {
  const cards = [makeCard({ tags: ['work', 'Bank'] }), makeCard({ tags: ['Work', 'family'] })];
  expect(allTags(cards)).toEqual(['Bank', 'family', 'work']);
});

test('a picker offers the tags in use, then the starters nothing uses yet', () => {
  expect(tagOptions([])).toEqual(['ID', 'Insurance', 'Membership']);
  expect(tagOptions([makeCard({ tags: ['Vehicle', 'id'] })])).toEqual(['id', 'Vehicle', 'Insurance', 'Membership']);
});

describe('resolveTag', () => {
  const known = ['Vehicle', 'insurance'];

  test('a name already known picks it, ignoring case and spaces', () => {
    expect(resolveTag(' vehicle ', known)).toBe('Vehicle');
    expect(resolveTag('INSURANCE', known)).toBe('insurance');
  });

  test('a starter is picked by name even when no card has it', () => {
    expect(resolveTag('membership', known)).toBe('Membership');
  });

  test('a new name becomes a new tag, as typed', () => {
    expect(resolveTag('  boat   papers', known)).toBe('boat papers');
  });

  test('blank or too long is refused', () => {
    expect(resolveTag('   ', known)).toBeNull();
    expect(resolveTag('x'.repeat(25), known)).toBeNull();
  });
});

test('tags match ignoring case', () => {
  const cards = [makeCard({ id: 'a', tags: ['Vehicle'] }), makeCard({ id: 'b', tags: ['ID'] })];
  expect(hasTag(cards[0], 'vehicle')).toBe(true);
  expect(cardsWithTag('VEHICLE', cards).map((c) => c.id)).toEqual(['a']);
});

test('a card tagged ID is an ID', () => {
  expect(isId(makeCard({ tags: ['Family', 'id'] }))).toBe(true);
  expect(isId(makeCard({ tags: ['Passport'] }))).toBe(false);
});

describe('a category from before categories became tags', () => {
  test('a built-in becomes its label, a typed one stays as typed', () => {
    expect(legacyCategoryTag('id')).toBe(strings.tags.starters.id);
    expect(legacyCategoryTag('insurance')).toBe('Insurance');
    expect(legacyCategoryTag('  Vehicle   papers ')).toBe('Vehicle papers');
  });

  test('Other, the retired Loyalty and anything unusable become no tag', () => {
    expect(legacyCategoryTag('other')).toBeNull();
    expect(legacyCategoryTag('loyalty')).toBeNull();
    expect(legacyCategoryTag('   ')).toBeNull();
    expect(legacyCategoryTag('x'.repeat(25))).toBeNull();
    expect(legacyCategoryTag(undefined)).toBeNull();
    expect(legacyCategoryTag(7)).toBeNull();
  });

  test('it goes first among the tags the card already had, without repeating one', () => {
    expect(withLegacyCategory(['Family'], 'id')).toEqual(['ID', 'Family']);
    expect(withLegacyCategory(['family', 'Vehicle'], 'vehicle')).toEqual(['vehicle', 'family']);
    expect(withLegacyCategory(['Family'], 'other')).toEqual(['Family']);
    expect(withLegacyCategory(['Family'], undefined)).toEqual(['Family']);
  });
});

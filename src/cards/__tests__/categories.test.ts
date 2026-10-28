import { makeCard } from '../../../test/fixtures';
import { strings } from '../../strings';
import { cardsInCategory, categoryLabel, categoryOptions, resolveCategory } from '../categories';

test('built-ins show their label, typed categories their own name', () => {
  expect(categoryLabel('id')).toBe(strings.categories.id);
  expect(categoryLabel('Vehicle')).toBe('Vehicle');
});

describe('resolveCategory', () => {
  const known = ['id', 'insurance', 'Vehicle'];

  test('a name already in the list picks it, ignoring case and spaces', () => {
    expect(resolveCategory(' vehicle ', known)).toBe('Vehicle');
    expect(resolveCategory('INSURANCE', known)).toBe('insurance');
    expect(resolveCategory('Id', known)).toBe('id');
  });

  test("a built-in's label picks it even after it was deleted from the list", () => {
    expect(resolveCategory('Membership', known)).toBe('membership');
  });

  test('a new name becomes a new category, capitalised so it never reads back as a key', () => {
    expect(resolveCategory('  boat   papers', known)).toBe('Boat papers');
    expect(resolveCategory('loyalty', known)).toBe('Loyalty');
  });

  test('blank or too long is refused', () => {
    expect(resolveCategory('   ', known)).toBeNull();
    expect(resolveCategory('x'.repeat(25), known)).toBeNull();
  });
});

test('options are the saved list, plus any category a card holds that the list lacks', () => {
  const cards = [makeCard({ category: 'Boat' }), makeCard({ category: 'id' })];
  expect(categoryOptions(['id', 'Vehicle'], cards)).toEqual(['id', 'Vehicle', 'Boat']);
});

test('cardsInCategory finds the cards using a category', () => {
  const cards = [makeCard({ id: 'a', category: 'Vehicle' }), makeCard({ id: 'b', category: 'id' })];
  expect(cardsInCategory('Vehicle', cards).map((c) => c.id)).toEqual(['a']);
});

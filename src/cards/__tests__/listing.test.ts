import { makeCard } from '../../../test/fixtures';
import { filterCards, sortCards, splitPinned } from '../listing';

const cards = [
  makeCard({ id: 'a', name: 'zoo pass', pinned: false }),
  makeCard({ id: 'b', name: 'Library', pinned: true, position: 1 }),
  makeCard({ id: 'c', name: 'Emirates ID', category: 'id', pinned: true, position: 0, number: '784 1990' }),
  makeCard({ id: 'd', name: 'Aster insurance', category: 'insurance', pinned: false }),
];

test('pinned by position first, then the rest alphabetically (case-insensitive)', () => {
  expect(sortCards(cards).map((c) => c.id)).toEqual(['c', 'b', 'd', 'a']);
});

test('splitPinned', () => {
  const { pinned, others } = splitPinned(sortCards(cards));
  expect(pinned.map((c) => c.id)).toEqual(['c', 'b']);
  expect(others.map((c) => c.id)).toEqual(['d', 'a']);
});

test('filter by name, case-insensitive', () => {
  expect(filterCards(cards, { query: 'LIB', category: null }).map((c) => c.id)).toEqual(['b']);
});

test('filter by card number ignoring spaces', () => {
  expect(filterCards(cards, { query: '7841990', category: null }).map((c) => c.id)).toEqual(['c']);
});

test('filter by category, combined with query', () => {
  expect(filterCards(cards, { query: '', category: 'insurance' }).map((c) => c.id)).toEqual(['d']);
  expect(filterCards(cards, { query: 'zoo', category: 'insurance' })).toEqual([]);
});

test('blank query and no category returns everything', () => {
  expect(filterCards(cards, { query: '  ', category: null })).toHaveLength(4);
});

import { makeCard } from '../../../test/fixtures';
import { filterCards, isExpiringSoon, sortCards, sortForGallery, splitPinned } from '../listing';

const cards = [
  makeCard({ id: 'a', name: 'zoo pass', pinned: false }),
  makeCard({ id: 'b', name: 'Library', pinned: true, position: 1 }),
  makeCard({ id: 'c', name: 'Emirates ID', category: 'id', pinned: true, position: 0 }),
  makeCard({ id: 'e', name: '', category: 'membership', pinned: false }),
  makeCard({ id: 'd', name: 'Aster insurance', category: 'insurance', pinned: false }),
];

test('pinned by position first, then the rest alphabetically (case-insensitive)', () => {
  expect(sortCards(cards).map((c) => c.id)).toEqual(['c', 'b', 'd', 'e', 'a']);
});

test('splitPinned', () => {
  const { pinned, others } = splitPinned(sortCards(cards));
  expect(pinned.map((c) => c.id)).toEqual(['c', 'b']);
  expect(others.map((c) => c.id)).toEqual(['d', 'e', 'a']);
});

test('filter by name, case-insensitive', () => {
  expect(filterCards(cards, { query: 'LIB', category: null }).map((c) => c.id)).toEqual(['b']);
});

test('an unnamed card sorts and matches by its category', () => {
  expect(filterCards(cards, { query: 'member', category: null }).map((c) => c.id)).toEqual(['e']);
});

test('filter by category, combined with query', () => {
  expect(filterCards(cards, { query: '', category: 'insurance' }).map((c) => c.id)).toEqual(['d']);
  expect(filterCards(cards, { query: 'zoo', category: 'insurance' })).toEqual([]);
});

test('blank query and no category returns everything', () => {
  expect(filterCards(cards, { query: '  ', category: null })).toHaveLength(5);
});

test('search matches names, not the hidden tags', () => {
  const cards = [makeCard({ id: 'a', name: 'Daman', tags: ['Health', 'Work'] }), makeCard({ id: 'b', name: 'Gym' })];
  expect(filterCards(cards, { query: 'heal', category: null }).map((c) => c.id)).toEqual([]);
  expect(filterCards(cards, { query: 'dam', category: null }).map((c) => c.id)).toEqual(['a']);
});

test('a typed category filters like a built-in one', () => {
  const cards = [makeCard({ id: 'a', category: 'Vehicle' }), makeCard({ id: 'b', category: 'id' })];
  expect(filterCards(cards, { query: '', category: 'Vehicle' }).map((c) => c.id)).toEqual(['a']);
});

describe('gallery order', () => {
  const cards = [
    makeCard({ id: 'b', name: 'Bravo', expiresOn: '2027-03-01', createdAt: 3 }),
    makeCard({ id: 'n', name: 'No date', expiresOn: null, createdAt: 4 }),
    makeCard({ id: 'a', name: 'alpha', expiresOn: '2026-12-01', createdAt: 1 }),
    makeCard({ id: 'c', name: 'Charlie', expiresOn: '2026-12-01', createdAt: 2 }),
  ];
  const ids = (list: typeof cards) => list.map((c) => c.id);

  test('by name, ignoring case', () => {
    expect(ids(sortForGallery(cards, 'name'))).toEqual(['a', 'b', 'c', 'n']);
  });

  test('by expiry: soonest first, same day by name, no date last', () => {
    expect(ids(sortForGallery(cards, 'expiry'))).toEqual(['a', 'c', 'b', 'n']);
  });

  test('by date added: newest first', () => {
    expect(ids(sortForGallery(cards, 'added'))).toEqual(['n', 'b', 'c', 'a']);
  });

  test('leaves the list it was given alone', () => {
    sortForGallery(cards, 'name');
    expect(ids(cards)).toEqual(['b', 'n', 'a', 'c']);
  });
});

test('expiring soon means expired, due today, or due within the reminder window', () => {
  const now = new Date(2026, 9, 31, 12);
  const on = (expiresOn: string | null) => isExpiringSoon(makeCard({ expiresOn }), now);
  expect(on('2026-10-01')).toBe(true); // expired
  expect(on('2026-10-31')).toBe(true); // today
  expect(on('2026-11-29')).toBe(true); // 29 days
  expect(on('2027-01-31')).toBe(false);
  expect(on(null)).toBe(false);
});

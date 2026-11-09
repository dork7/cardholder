import { makeCard } from '../../../test/fixtures';
import { buildLookup, excerpt, lookupIsStale, parseLookup } from '../lookup';

const NOW = new Date('2026-11-09T10:00:00Z');

test('lists every document by name with its details, a short excerpt and its reference', () => {
  const cards = [
    makeCard({ id: 'z1', name: 'Visa', category: 'id', expiresOn: '2027-05-31', tags: ['family'], readText: { front: 'UNITED ARAB EMIRATES\nRESIDENCE', back: '' } }),
    makeCard({ id: 'a1', name: 'Allianz', category: 'insurance', hasBack: true, readText: null }),
  ];
  const md = buildLookup(cards, NOW);
  expect(md).toContain('# Document lookup');
  expect(md).toContain('2 documents.');
  expect(md).toContain('Made 2026-11-09.');
  const rows = parseLookup(md);
  // Alphabetical: Allianz before Visa.
  expect(rows.map((r) => [r.index, r.id])).toEqual([
    [1, 'a1'],
    [2, 'z1'],
  ]);
  expect(rows[1].line).toContain('| 2027-05-31 | family |');
  expect(rows[1].line).toContain('UNITED ARAB EMIRATES RESIDENCE');
  expect(rows[0].line).toContain('front and back');
  expect(rows[0].line).toContain('not read yet');
});

test('text that would break the table is made safe, and long text is cut short', () => {
  const card = makeCard({ name: 'A | B', readText: { front: `x|y\n${'word '.repeat(60)}`, back: '' } });
  const row = parseLookup(buildLookup([card], NOW))[0];
  expect(row.line).toContain('A / B');
  expect(excerpt(card).length).toBeLessThanOrEqual(120);
  expect(excerpt(card).endsWith('…')).toBe(true);
  expect(excerpt(makeCard({ readText: { front: '', back: '' } }))).toBe('no text found');
});

test('with no documents the file says so', () => {
  expect(parseLookup(buildLookup([], NOW))).toEqual([]);
  expect(buildLookup([], NOW)).toContain('No documents yet.');
});

test('is out of date once a document is added, removed or changed after it was made', () => {
  const a = makeCard({ id: 'a', updatedAt: 100 });
  const b = makeCard({ id: 'b', updatedAt: 100 });
  const lookup = { createdAt: 200, ids: ['a', 'b'] };
  expect(lookupIsStale(lookup, [a, b])).toBe(false);
  expect(lookupIsStale(lookup, [a])).toBe(true);
  expect(lookupIsStale(lookup, [a, b, makeCard({ id: 'c', updatedAt: 100 })])).toBe(true);
  expect(lookupIsStale(lookup, [a, { ...b, updatedAt: 300 }])).toBe(true);
  expect(lookupIsStale(lookup, [a, makeCard({ id: 'other', updatedAt: 100 })])).toBe(true);
});

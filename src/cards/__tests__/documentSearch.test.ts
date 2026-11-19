import { makeCard } from '../../../test/fixtures';
import { searchDocumentDetails, searchDocumentTitles } from '../documentSearch';

const cards = [
  makeCard({ id: 'title', name: 'Acme policy', readText: null }),
  makeCard({ id: 'content', name: 'Insurance', hasBack: true, folderId: 'f1',
    readText: { front: 'Policy 2025-ENH-00412', back: 'Employer: ACME LLC' } }),
  makeCard({ id: 'other', name: 'Gym', readText: null }),
];
const folders = [{ id: 'f1', name: 'Family', createdAt: 0 }];

test('title matches come first, and generated Details (.md) supply other keyword matches', async () => {
  const titles = searchDocumentTitles(cards, 'acme');
  expect(titles.map((card) => card.id)).toEqual(['title']);
  const details = await searchDocumentDetails(cards, folders, 'acme', new Set(titles.map((card) => card.id)));
  expect(details.map((card) => card.id)).toEqual(['content']);
});

test('details search finds folder and scanned text, including numbers with different separators', async () => {
  const find = async (query: string) =>
    (await searchDocumentDetails(cards, folders, query, new Set())).map((card) => card.id);
  expect(await find('family')).toContain('content');
  expect(await find('2025ENH00412')).toContain('content');
  expect(await find('employer acme')).toContain('content');
});

test('details search finds text that appears only on a later PDF page', async () => {
  const pdf = makeCard({ id: 'pdf', name: 'Policy', pdf: { pageCount: 3, coverPage: 0 },
    readText: { front: 'Cover', back: 'Terms', pages: ['Cover', 'Terms', 'Renewal code Z8Q4'] } });
  expect((await searchDocumentDetails([pdf], [], 'Z8Q4', new Set())).map((card) => card.id)).toEqual(['pdf']);
});

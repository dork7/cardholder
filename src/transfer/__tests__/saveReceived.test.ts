import { image, makeStore } from '../../../test/fixtures';
import { saveReceived } from '../saveReceived';

jest.mock('../images', () => ({
  withThumbnail: async (front: { jpegBase64: string; aspect: number }) => ({ ...front, thumbJpegBase64: front.jpegBase64 }),
}));

const KEY = 'd'.repeat(64);
const content = {
  fields: { name: 'Emirates ID', category: 'id' as const, expiresOn: '2031-01-01', tags: ['Government'], documentKey: KEY },
  front: image('new-front'),
  back: null,
};

async function setup() {
  const { store } = await makeStore();
  const ask = jest.fn(async () => 'keep' as const);
  const ctx = async () => ({ store, cards: await store.list(), unlocked: false, askReplace: ask, nameOf: () => 'Old' });
  return { store, ask, ctx };
}

test('a new card is saved unpinned and outside any folder', async () => {
  const { store, ask, ctx } = await setup();
  const result = await saveReceived(content, await ctx());
  expect(result).toMatchObject({ kind: 'saved', card: { name: 'Emirates ID', tags: ['Government'], pinned: false, folderId: null } });
  expect(ask).not.toHaveBeenCalled();
  expect(await store.count()).toBe(1);
});

test('the same document already here offers Replace, which keeps its pin and folder', async () => {
  const { store, ask, ctx } = await setup();
  const folder = await store.createFolder('Family');
  const old = await store.create({ ...content.fields, name: 'Old ID', folderId: folder.id }, { front: { ...image('old'), thumbJpegBase64: 'x' }, back: image('old-back') });
  await store.setPinned(old.id, true);
  ask.mockResolvedValueOnce('replace' as never);
  const result = await saveReceived(content, await ctx());
  expect(result).toMatchObject({ kind: 'saved', card: { id: old.id, name: 'Emirates ID', pinned: true, folderId: folder.id, hasBack: false } });
  expect(await store.count()).toBe(1);
});

test('cancelling the Replace question saves nothing', async () => {
  const { store, ask, ctx } = await setup();
  await store.create({ ...content.fields, folderId: null }, { front: { ...image('old'), thumbJpegBase64: 'x' }, back: null });
  ask.mockResolvedValueOnce('cancel' as never);
  expect(await saveReceived(content, await ctx())).toEqual({ kind: 'cancelled' });
  expect(await store.count()).toBe(1);
});

import { fields, images, makeStore } from '../../../test/fixtures';
import { moveToCategory, removeAll, shouldUnpin, togglePinned } from '../batch';
import { sortCards } from '../listing';

async function threeCards() {
  const { store } = await makeStore();
  const a = await store.create(fields({ name: 'A', category: 'id' }), images('a'));
  const b = await store.create(fields({ name: 'B', category: 'insurance', expiresOn: '2027-01-01' }), images('b'));
  const c = await store.create(fields({ name: 'C', category: 'membership' }), images('c'));
  const byId = async () => new Map((await store.list()).map((card) => [card.id, card]));
  return { store, a, b, c, byId };
}

test('pins every selected card, after the ones already pinned, in the order picked', async () => {
  const { store, a, b, c } = await threeCards();
  await store.setPinned(b.id, true);
  const failed = await togglePinned(store, [c, a]);
  expect(failed).toBe(0);
  expect(sortCards(await store.list()).filter((x) => x.pinned).map((x) => x.name)).toEqual(['B', 'C', 'A']);
});

test('when every selected card is pinned already, unpins them', async () => {
  const { store, a, b, byId } = await threeCards();
  await store.setPinned(a.id, true);
  await store.setPinned(b.id, true);
  const pinnedA = (await byId()).get(a.id)!;
  const pinnedB = (await byId()).get(b.id)!;
  expect(shouldUnpin([pinnedA, pinnedB])).toBe(true);
  await togglePinned(store, [pinnedA, pinnedB]);
  expect([...(await byId()).values()].some((x) => x.pinned)).toBe(false);
});

test('moves cards to a category and keeps everything else about them', async () => {
  const { store, a, b, c, byId } = await threeCards();
  expect(await moveToCategory(store, [a, b], 'other')).toBe(0);
  const after = await byId();
  expect(after.get(a.id)?.category).toBe('other');
  expect(after.get(b.id)).toMatchObject({ category: 'other', name: 'B', expiresOn: '2027-01-01' });
  expect(after.get(c.id)?.category).toBe('membership');
  expect(await store.loadImage(b.id, 'front')).not.toBeNull();
});

test('deletes only the cards given', async () => {
  const { store, a, b, c, byId } = await threeCards();
  expect(await removeAll(store, [a, c])).toBe(0);
  expect([...(await byId()).keys()]).toEqual([b.id]);
});

test('one failure does not stop the rest, and is counted', async () => {
  const { store, a, b, c, byId } = await threeCards();
  const flaky = { ...store, remove: (id: string) => (id === b.id ? Promise.reject(new Error('disk')) : store.remove(id)) };
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  expect(await removeAll(flaky, [a, b, c])).toBe(1);
  warn.mockRestore();
  expect([...(await byId()).keys()]).toEqual([b.id]);
});

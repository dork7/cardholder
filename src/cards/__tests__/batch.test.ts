import { fields, images, makeStore } from '../../../test/fixtures';
import { addTags, overTagLimit, removeTag, removeTagEverywhere, shouldUnpin, togglePinned, withTags } from '../batch';
import { sortCards } from '../listing';

// Three unpinned cards; these tests cover pinning them in a batch.
async function threeCards() {
  const { store } = await makeStore();
  const made = [
    await store.create(fields({ name: 'A' }), images('a')),
    await store.create(fields({ name: 'B', expiresOn: '2027-01-01' }), images('b')),
    await store.create(fields({ name: 'C' }), images('c')),
  ];
  for (const card of made) await store.setPinned(card.id, false);
  const byId = async () => new Map((await store.list()).map((card) => [card.id, card]));
  const cards = await byId();
  const [a, b, c] = made.map((card) => cards.get(card.id)!);
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

test('takes a tag off every card that has it, and keeps everything else about them', async () => {
  const { store, a, b, c, byId } = await threeCards();
  await addTags(store, [a, b], ['Family', 'Work']);
  await addTags(store, [c], ['Work']);
  expect(await removeTagEverywhere(store, await store.list(), 'family')).toBe(0);
  const after = await byId();
  expect(after.get(a.id)?.tags).toEqual(['Work']);
  expect(after.get(b.id)).toMatchObject({ tags: ['Work'], name: 'B', expiresOn: '2027-01-01' });
  expect(after.get(c.id)?.tags).toEqual(['Work']);
  expect(await store.loadImage(b.id, 'front')).not.toBeNull();
});

describe('tags', () => {
  test('adds several tags to several cards, keeping the ones they had and skipping repeats', async () => {
    const { store, a, b, byId } = await threeCards();
    await store.update(a.id, { ...fields({ name: 'A' }), tags: ['Work'] });
    const taggedA = (await byId()).get(a.id)!;
    expect(await addTags(store, [taggedA, b], ['work', 'Family'])).toBe(0);
    const now = await byId();
    expect(now.get(a.id)?.tags).toEqual(['Work', 'Family']);
    expect(now.get(b.id)?.tags).toEqual(['work', 'Family']);
  });

  test('a card that already has every tag is not saved again', async () => {
    const { store, a, byId } = await threeCards();
    await store.update(a.id, { ...fields({ name: 'A' }), tags: ['Work'] });
    const tagged = (await byId()).get(a.id)!;
    const update = jest.spyOn(store, 'update');
    await addTags(store, [tagged], ['WORK']);
    expect(update).not.toHaveBeenCalled();
  });

  test('removes one tag, ignoring case, and keeps the rest', async () => {
    const { store, a, byId } = await threeCards();
    await store.update(a.id, { ...fields({ name: 'A' }), tags: ['Work', 'Family'] });
    await removeTag(store, (await byId()).get(a.id)!, 'work');
    expect((await byId()).get(a.id)?.tags).toEqual(['Family']);
  });

  test('knows which cards would go over the limit of 8', async () => {
    const { a, b } = await threeCards();
    const full = { ...a, tags: ['1', '2', '3', '4', '5', '6', '7'] };
    expect(withTags(full, ['8'])).toHaveLength(8);
    expect(overTagLimit([full, b], ['8'])).toEqual([]);
    expect(overTagLimit([full, b], ['8', '9']).map((c) => c.id)).toEqual([a.id]);
  });
});

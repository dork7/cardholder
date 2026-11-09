import { fields, images, makeStore } from '../../../test/fixtures';
import { base64, utf8 } from '../../crypto/bytes';
import { readUnreadCards, rereadCard, rereadCards } from '../readBackfill';

// The fixtures' "JPEGs" are markers like JPEG:a; the fake reader returns the marker as the card's text.
const fakeRead = async (jpegBase64: string) => utf8.decode(base64.decode(jpegBase64)).replace('JPEG:', 'TEXT ');

test('reads each card saved without text, front and back, once', async () => {
  const { store } = await makeStore();
  const old = await store.create(fields({ name: 'Old' }), images('old', true));
  const done = await store.create(fields({ name: 'Read', readText: { front: 'KEEP', back: '' } }), images('done'));
  const read = jest.fn(fakeRead);

  expect(await readUnreadCards(store, read)).toBe(1);
  expect((await store.get(old.id))?.readText).toEqual({ front: 'TEXT old', back: 'TEXT old-back' });
  expect((await store.get(done.id))?.readText).toEqual({ front: 'KEEP', back: '' });
  expect((await store.get(old.id))?.name).toBe('Old');

  read.mockClear();
  expect(await readUnreadCards(store, read)).toBe(0);
  expect(read).not.toHaveBeenCalled();
});

test('a card with nothing readable is still marked as read, so it is not read every launch', async () => {
  const { store } = await makeStore();
  const card = await store.create(fields(), images('blank'));
  await readUnreadCards(store, async () => '');
  expect((await store.get(card.id))?.readText).toEqual({ front: '', back: '' });
});

test('a card the user edits while it is being read is left alone', async () => {
  const { store } = await makeStore();
  const card = await store.create(fields({ name: 'Before' }), images('a'));
  await readUnreadCards(store, async (jpeg) => {
    await store.update(card.id, fields({ name: 'Edited meanwhile' }));
    return fakeRead(jpeg);
  });
  const after = await store.get(card.id);
  expect(after?.name).toBe('Edited meanwhile');
  expect(after?.readText).toBeNull();
});

test('one card failing does not stop the others', async () => {
  const { store } = await makeStore();
  const bad = await store.create(fields({ name: 'Bad' }), images('bad'));
  const good = await store.create(fields({ name: 'Good' }), images('good'));
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  const updated = await readUnreadCards(store, async (jpeg) => {
    if (jpeg === images('bad').front.jpegBase64) throw new Error('OCR failed');
    return fakeRead(jpeg);
  });
  warn.mockRestore();
  expect(updated).toBe(1);
  expect((await store.get(good.id))?.readText?.front).toBe('TEXT good');
  expect((await store.get(bad.id))?.readText).toBeNull();
});

describe('Recreate .md', () => {
  test('reads a document again even if it was read before, replacing its text', async () => {
    const { store } = await makeStore();
    const card = await store.create(fields({ name: 'Visa', readText: { front: 'OLD', back: '' } }), images('visa', true));
    expect(await rereadCard(store, card, fakeRead)).toBe(true);
    const after = await store.get(card.id);
    expect(after?.readText).toEqual({ front: 'TEXT visa', back: 'TEXT visa-back' });
    expect(after?.name).toBe('Visa');
  });

  test('several at once: each is read, and one failing does not stop the others', async () => {
    const { store } = await makeStore();
    const a = await store.create(fields({ name: 'A' }), images('a'));
    const b = await store.create(fields({ name: 'B' }), images('b'));
    const c = await store.create(fields({ name: 'C' }), images('c'));
    const progress: number[] = [];
    const read = async (jpeg: string) => {
      if ((await fakeRead(jpeg)) === 'TEXT b') throw new Error('unreadable');
      return fakeRead(jpeg);
    };
    expect(await rereadCards(store, [a, b, c], read, (n) => progress.push(n))).toBe(1);
    expect(progress).toEqual([1, 2, 3]);
    expect((await store.get(a.id))?.readText?.front).toBe('TEXT a');
    expect((await store.get(b.id))?.readText).toBeNull();
    expect((await store.get(c.id))?.readText?.front).toBe('TEXT c');
  });

  test('a document edited while it is read keeps the edit, and counts as not done', async () => {
    const { store } = await makeStore();
    const card = await store.create(fields({ name: 'Before' }), images('a'));
    const read = async (jpeg: string) => {
      await store.update(card.id, fields({ name: 'Edited' }));
      return fakeRead(jpeg);
    };
    expect(await rereadCards(store, [card], read)).toBe(1);
    expect((await store.get(card.id))?.name).toBe('Edited');
  });
});

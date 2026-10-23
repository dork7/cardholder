import { createMemoryBlobStore } from '../../../test/memoryBlobStore';
import { memoryDb } from '../../../test/memoryDb';
import { fields, frontImage, image, images, importEntry, makeStore } from '../../../test/fixtures';
import { createAead, generateKey } from '../../crypto/aead';
import { base64, utf8 } from '../../crypto/bytes';
import { createCardStore, CardNotFoundError, FolderNotFoundError } from '../cardStore';
import { migrate } from '../../storage/sqlDb';
import { BlobStore } from '../../storage/blobStore';

async function makeStoreWithBlobPut(
  failPut: (name: string, priorPutNames: readonly string[]) => boolean,
): Promise<{ store: ReturnType<typeof createCardStore>; blobs: ReturnType<typeof createMemoryBlobStore> }> {
  const db = memoryDb();
  await migrate(db);
  const inner = createMemoryBlobStore();
  const priorPutNames: string[] = [];
  const blobs: BlobStore & { raw: Map<string, Uint8Array> } = {
    raw: inner.raw,
    async put(name, bytes) {
      if (failPut(name, priorPutNames)) throw new Error('put failed');
      priorPutNames.push(name);
      return inner.put(name, bytes);
    },
    get: (name) => inner.get(name),
    remove: (name) => inner.remove(name),
    list: () => inner.list(),
  };
  let clock = 1_000_000;
  let nextId = 0;
  const store = createCardStore({
    db,
    blobs,
    aead: createAead(generateKey()),
    now: () => (clock += 1_000),
    newId: () => `card${++nextId}`,
  });
  return { store, blobs: inner };
}

const text = (b64: string | null) => (b64 === null ? null : utf8.decode(base64.decode(b64)));
const INSERT =
  'INSERT INTO cards (id, pinned, position, payload, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)';

test('create stores fields, pins the card and appends it to the pinned order', async () => {
  const { store } = await makeStore();
  const a = await store.create(fields({ name: 'Emirates ID', category: 'id' }), images('a'));
  const b = await store.create(fields({ name: 'Gym' }), images('b', true));
  expect(a).toMatchObject({ id: 'card1', name: 'Emirates ID', category: 'id', pinned: true, position: 0, hasBack: false, backAspect: null });
  expect(b).toMatchObject({ id: 'card2', pinned: true, position: 1, hasBack: true, backAspect: 1.586 });
  expect(await store.get('card1')).toEqual(a);
  expect(await store.count()).toBe(2);
  expect((await store.ids()).sort()).toEqual(['card1', 'card2']);
});

test('images round-trip per side', async () => {
  const { store } = await makeStore();
  const card = await store.create(fields(), images('x', true));
  expect(text(await store.loadImage(card.id, 'front'))).toBe('JPEG:x');
  expect(text(await store.loadImage(card.id, 'thumb'))).toBe('THUMB:x');
  expect(text(await store.loadImage(card.id, 'back'))).toBe('JPEG:x-back');
});

test('a card without a back has no back image', async () => {
  const { store } = await makeStore();
  const card = await store.create(fields(), images('x'));
  expect(await store.loadImage(card.id, 'back')).toBeNull();
});

test('nothing readable is stored in plaintext', async () => {
  const { store, db, blobs } = await makeStore();
  await store.create(fields({ name: 'Emirates ID', expiresOn: '2031-12-31' }), images('secret', true));
  const row = await db.getFirstAsync<{ payload: Uint8Array }>('SELECT payload FROM cards', []);
  const payloadText = utf8.decode(row!.payload);
  expect(payloadText).not.toContain('Emirates');
  expect(payloadText).not.toContain('2031');
  expect(blobs.raw.size).toBe(3);
  for (const bytes of blobs.raw.values()) expect(utf8.decode(bytes)).not.toContain('secret');
});

test('update changes fields and images and bumps updatedAt', async () => {
  const { store } = await makeStore();
  const card = await store.create(fields(), images('old', true));
  const updated = await store.update(card.id, fields({ name: 'Gold Gym', expiresOn: '2027-05-01' }), {
    front: frontImage('new', 0.7),
  });
  expect(updated).toMatchObject({ name: 'Gold Gym', expiresOn: '2027-05-01', frontAspect: 0.7, hasBack: true });
  expect(updated.updatedAt).toBeGreaterThan(card.updatedAt);
  expect(text(await store.loadImage(card.id, 'front'))).toBe('JPEG:new');
  expect(text(await store.loadImage(card.id, 'thumb'))).toBe('THUMB:new');
  expect(text(await store.loadImage(card.id, 'back'))).toBe('JPEG:old-back');
  expect(await store.get(card.id)).toEqual(updated);
});

test('update with back: null removes the back image', async () => {
  const { store, blobs } = await makeStore();
  const card = await store.create(fields(), images('x', true));
  const updated = await store.update(card.id, fields(), { back: null });
  expect(updated).toMatchObject({ hasBack: false, backAspect: null });
  expect(blobs.raw.has(`${card.id}.back`)).toBe(false);
});

test('update can add a back image', async () => {
  const { store } = await makeStore();
  const card = await store.create(fields(), images('x'));
  const updated = await store.update(card.id, fields(), { back: image('added', 1.5) });
  expect(updated).toMatchObject({ hasBack: true, backAspect: 1.5 });
  expect(text(await store.loadImage(card.id, 'back'))).toBe('JPEG:added');
});

test('update of a missing card throws CardNotFoundError', async () => {
  const { store } = await makeStore();
  await expect(store.update('nope', fields())).rejects.toBeInstanceOf(CardNotFoundError);
});

test('remove deletes the row and every image immediately', async () => {
  const { store, blobs } = await makeStore();
  const card = await store.create(fields(), images('x', true));
  await store.remove(card.id);
  expect(await store.get(card.id)).toBeNull();
  expect(await store.count()).toBe(0);
  expect(blobs.raw.size).toBe(0);
});

test('unpinned cards sort alphabetically after pinned; re-pinning appends to the end', async () => {
  const { store } = await makeStore();
  const a = await store.create(fields({ name: 'B card' }), images('a'));
  const b = await store.create(fields({ name: 'A card' }), images('b'));
  const c = await store.create(fields({ name: 'C card' }), images('c'));
  await store.setPinned(a.id, false);
  await store.setPinned(b.id, false);
  expect((await store.list()).map((x) => x.id)).toEqual([c.id, b.id, a.id]);
  await store.setPinned(a.id, true);
  expect((await store.list()).map((x) => x.id)).toEqual([c.id, a.id, b.id]);
});

test('setPinned to the current state does not move the card', async () => {
  const { store } = await makeStore();
  const a = await store.create(fields(), images('a'));
  await store.create(fields(), images('b'));
  await store.setPinned(a.id, true);
  expect((await store.get(a.id))!.position).toBe(0);
});

test('reorderPinned sets the pinned order', async () => {
  const { store } = await makeStore();
  const a = await store.create(fields(), images('a'));
  const b = await store.create(fields(), images('b'));
  const c = await store.create(fields(), images('c'));
  await store.reorderPinned([c.id, a.id, b.id]);
  expect((await store.list()).map((x) => x.id)).toEqual([c.id, a.id, b.id]);
});

test('lastChangeAt follows the latest create or update', async () => {
  const { store } = await makeStore();
  expect(await store.lastChangeAt()).toBeNull();
  const card = await store.create(fields(), images('a'));
  expect(await store.lastChangeAt()).toBe(card.updatedAt);
  const updated = await store.update(card.id, fields({ name: 'New' }));
  expect(await store.lastChangeAt()).toBe(updated.updatedAt);
});

test('list skips rows that cannot be decrypted', async () => {
  const { store, db } = await makeStore();
  const good = await store.create(fields(), images('x'));
  await db.runAsync(INSERT, ['broken', 1, 5, new Uint8Array([1, 2, 3]), 1, 1]);
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  expect((await store.list()).map((c) => c.id)).toEqual([good.id]);
  expect(warn).toHaveBeenCalled();
  warn.mockRestore();
});

describe('insertMany', () => {
  test('merge appends imported pinned cards after existing ones, in their own order', async () => {
    const { store } = await makeStore();
    const a = await store.create(fields({ name: 'Mine A' }), images('a'));
    const b = await store.create(fields({ name: 'Mine B' }), images('b'));
    await store.insertMany(
      [
        importEntry('imp1', { name: 'Imported 1', pinned: true, position: 5 }),
        importEntry('imp2', { name: 'Imported 2', pinned: true, position: 2 }, true),
        importEntry('imp3', { name: 'Imported 3', pinned: false, position: 0 }),
      ],
      { replace: false },
    );
    expect((await store.list()).map((c) => c.id)).toEqual([a.id, b.id, 'imp2', 'imp1', 'imp3']);
    expect(text(await store.loadImage('imp2', 'back'))).toBe('JPEG:imp2-back');
    expect((await store.get('imp1'))!.createdAt).toBe(1_000);
  });

  test('replace removes previous cards and their images', async () => {
    const { store, blobs } = await makeStore();
    const old = await store.create(fields(), images('old', true));
    await store.insertMany([importEntry('imp1')], { replace: true });
    expect(await store.ids()).toEqual(['imp1']);
    expect([...blobs.raw.keys()].filter((k) => k.startsWith(old.id))).toEqual([]);
    expect((await store.get('imp1'))!.position).toBe(0);
  });

  test('a failed replace leaves existing cards untouched', async () => {
    const { store, blobs } = await makeStore();
    const keep = await store.create(fields({ name: 'Keep me' }), images('keep', true));
    const keepBlobKeys = [...blobs.raw.keys()].sort();
    // Duplicate ids make the second INSERT fail inside the transaction.
    await expect(
      store.insertMany([importEntry('dup'), importEntry('dup')], { replace: true }),
    ).rejects.toThrow();
    expect((await store.list()).map((c) => c.name)).toEqual(['Keep me']);
    expect(text(await store.loadImage(keep.id, 'front'))).toBe('JPEG:keep');
    expect(text(await store.loadImage(keep.id, 'back'))).toBe('JPEG:keep-back');
    expect([...blobs.raw.keys()].sort()).toEqual(keepBlobKeys);
  });

  test('a failed replace does not overwrite an existing id\'s images before commit', async () => {
    const { store, blobs } = await makeStore();
    const keep = await store.create(fields({ name: 'Keep me' }), images('keep', true));
    const keepBlobKeys = [...blobs.raw.keys()].sort();
    await expect(
      store.insertMany(
        [importEntry(keep.id, { name: 'Imported overwrite' }, true), importEntry('dup'), importEntry('dup')],
        { replace: true },
      ),
    ).rejects.toThrow();
    expect((await store.list()).map((c) => c.name)).toEqual(['Keep me']);
    expect(text(await store.loadImage(keep.id, 'front'))).toBe('JPEG:keep');
    expect(text(await store.loadImage(keep.id, 'back'))).toBe('JPEG:keep-back');
    expect([...blobs.raw.keys()].sort()).toEqual(keepBlobKeys);
  });

  test('cleans up partial blobs when a new id\'s image write fails before commit', async () => {
    const { store, blobs } = await makeStoreWithBlobPut((name) => name === 'dup.thumb');
    const keep = await store.create(fields({ name: 'Keep me' }), images('keep', true));
    const keepBlobKeys = [...blobs.raw.keys()].sort();
    await expect(store.insertMany([importEntry('dup')], { replace: false })).rejects.toThrow('put failed');
    expect((await store.list()).map((c) => c.name)).toEqual(['Keep me']);
    expect([...blobs.raw.keys()].sort()).toEqual(keepBlobKeys);
  });

  test('does not delete committed new blobs when a post-commit existing-id write fails', async () => {
    const { store, blobs } = await makeStoreWithBlobPut(
      (name, prior) => name.endsWith('.front') && prior.some((p) => p.startsWith('imp1.')),
    );
    const keep = await store.create(fields({ name: 'Keep me' }), images('keep', true));
    await expect(
      store.insertMany([importEntry('imp1'), importEntry(keep.id, { name: 'Imported' })], { replace: true }),
    ).rejects.toThrow('put failed');
    expect(await store.get('imp1')).not.toBeNull();
    expect(text(await store.loadImage('imp1', 'front'))).toBe('JPEG:imp1');
    expect(text(await store.loadImage(keep.id, 'front'))).toBe('JPEG:keep');
    expect(blobs.raw.has('imp1.front')).toBe(true);
  });
});

test('cards saved before number and notes were removed still load, without them', async () => {
  const db = memoryDb();
  await migrate(db);
  const aead = createAead(generateKey());
  const store = createCardStore({ db, blobs: createMemoryBlobStore(), aead });
  const legacy = {
    name: 'Coffee club',
    category: 'loyalty',
    number: '1234',
    notes: 'Gold tier',
    expiresOn: null,
    hasBack: false,
    frontAspect: 1.586,
    backAspect: null,
  };
  await db.runAsync(
    'INSERT INTO cards (id, pinned, position, payload, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    ['old1', 0, 0, aead.seal(utf8.encode(JSON.stringify(legacy))), 1, 1],
  );
  const [card] = await store.list();
  expect(card).toEqual({
    id: 'old1',
    name: 'Coffee club',
    category: 'other',
    expiresOn: null,
    folderId: null,
    pinned: false,
    position: 0,
    hasBack: false,
    frontAspect: 1.586,
    backAspect: null,
    createdAt: 1,
    updatedAt: 1,
  });
});

describe('folders', () => {
  test('are created, renamed and listed by name, with their names sealed', async () => {
    const { store, db } = await makeStore();
    const work = await store.createFolder('  Work ');
    await store.createFolder('family');
    expect(work.name).toBe('Work');
    expect((await store.listFolders()).map((f) => f.name)).toEqual(['family', 'Work']);
    await store.renameFolder(work.id, 'Office');
    expect((await store.listFolders()).map((f) => f.name)).toEqual(['family', 'Office']);
    const rows = await db.getAllAsync<{ payload: Uint8Array }>('SELECT payload FROM folders', []);
    for (const row of rows) expect(Buffer.from(row.payload).toString('latin1')).not.toMatch(/family|Office/);
  });

  test('renaming a folder that is gone fails', async () => {
    const { store } = await makeStore();
    await expect(store.renameFolder('nope', 'x')).rejects.toThrow(FolderNotFoundError);
  });

  test("a card's folder is saved on create and update", async () => {
    const { store } = await makeStore();
    const folder = await store.createFolder('Health');
    const card = await store.create(fields({ folderId: folder.id }), images('a'));
    expect((await store.get(card.id))!.folderId).toBe(folder.id);
    await store.update(card.id, fields({ folderId: null }));
    expect((await store.get(card.id))!.folderId).toBeNull();
  });

  test('deleting a folder keeps its cards, outside any folder', async () => {
    const { store } = await makeStore();
    const folder = await store.createFolder('Health');
    const card = await store.create(fields({ folderId: folder.id }), images('a'));
    await store.removeFolder(folder.id);
    expect(await store.listFolders()).toEqual([]);
    expect((await store.get(card.id))!.folderId).toBeNull();
  });

  test('insertMany writes folders: replace swaps them, merge keeps names already on the phone', async () => {
    const { store } = await makeStore();
    const mine = await store.createFolder('Mine');
    const incoming = [
      { id: mine.id, name: 'Theirs', createdAt: 1 },
      { id: 'f-new', name: 'New', createdAt: 2 },
    ];
    await store.insertMany([importEntry('x1', { folderId: 'f-new' })], { replace: false, folders: incoming });
    expect((await store.listFolders()).map((f) => f.name)).toEqual(['Mine', 'New']);
    expect((await store.get('x1'))!.folderId).toBe('f-new');

    await store.insertMany([], { replace: true, folders: [{ id: 'f-only', name: 'Only', createdAt: 3 }] });
    expect((await store.listFolders()).map((f) => f.id)).toEqual(['f-only']);
  });
});

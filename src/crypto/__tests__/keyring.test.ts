import { createMemoryBlobStore } from '../../../test/memoryBlobStore';
import { memoryDb } from '../../../test/memoryDb';
import { createMemoryVault } from '../../../test/memoryVault';
import { createSettings } from '../../storage/settings';
import { migrate } from '../../storage/sqlDb';
import { generateKey } from '../aead';
import { utf8 } from '../bytes';
import { openKeyring, startFresh } from '../keyring';

async function setup() {
  const db = memoryDb();
  await migrate(db);
  return { db, settings: createSettings(db), blobs: createMemoryBlobStore() };
}

test('first launch creates a key and a key-check', async () => {
  const { settings } = await setup();
  const vault = createMemoryVault();
  const result = await openKeyring(vault, settings);
  expect(result.status).toBe('ready');
  expect(vault.key).toHaveLength(32);
  expect(await settings.get('keyCheck')).not.toBeNull();
});

test('second launch reuses the same key', async () => {
  const { settings } = await setup();
  const vault = createMemoryVault();
  const first = await openKeyring(vault, settings);
  if (first.status !== 'ready') throw new Error('expected ready');
  const sealed = first.aead.seal(utf8.encode('hello'));
  const second = await openKeyring(vault, settings);
  if (second.status !== 'ready') throw new Error('expected ready');
  expect(utf8.decode(second.aead.open(sealed))).toBe('hello');
});

test('reinstall with a surviving vault key reuses it', async () => {
  const { settings } = await setup();
  const key = generateKey();
  const vault = createMemoryVault(key);
  expect((await openKeyring(vault, settings)).status).toBe('ready');
  expect(vault.key).toBe(key);
});

test('orphaned when key-check exists but the vault is empty', async () => {
  const { settings } = await setup();
  await openKeyring(createMemoryVault(), settings);
  expect((await openKeyring(createMemoryVault(), settings)).status).toBe('orphaned');
});

test('orphaned when key-check exists but the vault holds a different key', async () => {
  const { settings } = await setup();
  await openKeyring(createMemoryVault(), settings);
  expect((await openKeyring(createMemoryVault(generateKey()), settings)).status).toBe('orphaned');
});

test('orphaned when the stored key is corrupt', async () => {
  const { settings } = await setup();
  await openKeyring(createMemoryVault(), settings);
  expect((await openKeyring(createMemoryVault(new Uint8Array(5)), settings)).status).toBe('orphaned');
});

test('startFresh wipes cards, settings and blobs and installs a new key', async () => {
  const { db, settings, blobs } = await setup();
  const vault = createMemoryVault();
  await openKeyring(vault, settings);
  const oldKey = vault.key;
  await db.runAsync(
    'INSERT INTO cards (id, pinned, position, payload, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    ['card1', 1, 0, new Uint8Array([1, 2, 3]), 1, 1],
  );
  await settings.set('unlocked', '1');
  await blobs.put('card1.front', new Uint8Array([9]));

  const aead = await startFresh({ db, blobs, vault, settings });

  expect(await db.getAllAsync('SELECT * FROM cards', [])).toHaveLength(0);
  expect(await settings.get('unlocked')).toBeNull();
  expect(await blobs.list()).toEqual([]);
  expect(vault.key).not.toEqual(oldKey);
  expect((await openKeyring(vault, settings)).status).toBe('ready');
  expect(utf8.decode(aead.open(aead.seal(utf8.encode('ok'))))).toBe('ok');
});

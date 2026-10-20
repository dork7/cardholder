import { fields, images } from '../../../test/fixtures';
import { createMemoryBlobStore } from '../../../test/memoryBlobStore';
import { memoryDb } from '../../../test/memoryDb';
import { createMemoryVault } from '../../../test/memoryVault';
import { boot, bootFresh } from '../boot';

test('a fresh install boots ready with an empty store', async () => {
  const result = await boot({ db: memoryDb(), blobs: createMemoryBlobStore(), vault: createMemoryVault() });
  if (result.status !== 'ready') throw new Error('expected ready');
  expect(await result.services.store.count()).toBe(0);
});

test('data restored without its key is orphaned', async () => {
  const db = memoryDb();
  const blobs = createMemoryBlobStore();
  const first = await boot({ db, blobs, vault: createMemoryVault() });
  if (first.status !== 'ready') throw new Error('expected ready');
  await first.services.store.create(fields(), images('a'));

  expect((await boot({ db, blobs, vault: createMemoryVault() })).status).toBe('orphaned');
});

test('bootFresh gives a working empty store that boots ready next time', async () => {
  const db = memoryDb();
  const blobs = createMemoryBlobStore();
  const first = await boot({ db, blobs, vault: createMemoryVault() });
  if (first.status !== 'ready') throw new Error('expected ready');
  await first.services.store.create(fields(), images('a'));

  const vault = createMemoryVault();
  const services = await bootFresh({ db, blobs, vault });
  expect(await services.store.count()).toBe(0);
  expect(blobs.raw.size).toBe(0);
  await services.store.create(fields({ name: 'New' }), images('b'));

  const again = await boot({ db, blobs, vault });
  if (again.status !== 'ready') throw new Error('expected ready');
  expect((await again.services.store.list()).map((c) => c.name)).toEqual(['New']);
});

import { SqlDb } from '../sqlDb';
import { memoryDb } from '../../../test/memoryDb';
import { createSettings } from '../settings';
import { migrate } from '../sqlDb';

async function setup() {
  const db = memoryDb();
  await migrate(db);
  return { db, settings: createSettings(db) };
}

test('migrate creates tables and is idempotent', async () => {
  const db = memoryDb();
  await migrate(db);
  await migrate(db);
  const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []);
  expect(version?.user_version).toBe(3);
  const tables = await db.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    [],
  );
  expect(tables.map((t) => t.name)).toEqual(['cards', 'folders', 'settings']);
});

test('missing setting is null', async () => {
  const { settings } = await setup();
  expect(await settings.get('lastExportAt')).toBeNull();
  expect(await settings.getNumber('lastExportAt')).toBeNull();
});

test('set, overwrite and remove', async () => {
  const { settings } = await setup();
  await settings.set('unlocked', '1');
  await settings.set('unlocked', '0');
  expect(await settings.get('unlocked')).toBe('0');
  await settings.remove('unlocked');
  expect(await settings.get('unlocked')).toBeNull();
});

test('getNumber parses numbers and ignores junk', async () => {
  const { settings } = await setup();
  await settings.set('lastExportAt', '1700000000000');
  expect(await settings.getNumber('lastExportAt')).toBe(1_700_000_000_000);
  await settings.set('lastExportAt', 'not a number');
  expect(await settings.getNumber('lastExportAt')).toBeNull();
});

test('a failed migration rolls back its schema change and leaves user_version unchanged', async () => {
  const real = memoryDb();
  let failNextVersionBump = true;
  const flaky: SqlDb = {
    ...real,
    async execAsync(sql) {
      if (failNextVersionBump && sql === 'PRAGMA user_version = 1') {
        failNextVersionBump = false;
        throw new Error('simulated crash');
      }
      return real.execAsync(sql);
    },
  };

  await expect(migrate(flaky)).rejects.toThrow('simulated crash');

  const version = await real.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []);
  expect(version?.user_version).toBe(0);
  const tables = await real.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    [],
  );
  expect(tables.map((t) => t.name)).toEqual([]);

  await migrate(flaky);
  const after = await real.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []);
  expect(after?.user_version).toBe(3);
});

test('upgrading unpins every card: no pin before it was chosen by the user', async () => {
  const db = memoryDb();
  let firstOnly = true;
  // Stop after the first migration, as an older app would have left the database.
  await migrate({
    ...db,
    async withTransactionAsync(fn) {
      if (!firstOnly) return;
      firstOnly = false;
      await db.withTransactionAsync(fn);
    },
  });
  await db.runAsync('INSERT INTO cards (id, pinned, position, payload, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)', [
    'a', 1, 3, new Uint8Array([1]), 1, 1,
  ]);
  await migrate(db);
  expect(await db.getFirstAsync('SELECT pinned, position FROM cards', [])).toEqual({ pinned: 0, position: 0 });
});

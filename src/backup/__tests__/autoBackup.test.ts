import { makeStore, fields, images } from '../../../test/fixtures';
import { createSettings } from '../../storage/settings';
import { decodeBackup } from '../backupFile';
import { autoBackupName, backupIsStale, createAutoBackup } from '../autoBackup';

const DAY = 86_400_000;
async function setup() {
  const { store, notes, db } = await makeStore();
  await store.create(fields({ name: 'Passport' }), images('passport'));
  const settings = createSettings(db);
  let secret: string | null = null;
  let now = 40 * DAY;
  const files = new Map<string, Uint8Array>();
  const destination = {
    write: jest.fn(async (_folder: string, name: string, bytes: Uint8Array) => { files.set(name, bytes); return name; }),
    remove: jest.fn(async (uri: string) => { files.delete(uri); }),
  };
  const schedule = jest.fn(async (_minutes: number | null) => {});
  const backup = createAutoBackup({ store, notes, settings, destination, schedule,
    secret: { get: async () => secret, set: async (value: string | null) => { secret = value; } },
    now: () => now,
  });
  return { backup, files, settings, destination, schedule, advance: (days: number) => { now += days * DAY; } };
}

test('enabling saves a restorable encrypted backup, then runs only when due', async () => {
  const { backup, files, schedule, advance, settings } = await setup();
  await backup.enable('daily', 'picked-folder', 'long enough');
  expect(schedule).toHaveBeenCalledWith(1440);
  const snapshot = await decodeBackup([...files.values()][0], 'long enough');
  expect(snapshot.cards[0].card.name).toBe('Passport');
  expect(await settings.getNumber('lastExportAt')).toBe(40 * DAY);
  await backup.run();
  expect(files.size).toBe(1);
  advance(1);
  await backup.run();
  expect(files.size).toBe(2);
});

test('weekly scheduling keeps the newest seven automatic backups', async () => {
  const { backup, files, destination, advance, schedule } = await setup();
  await backup.enable('weekly', 'picked-folder', 'long enough');
  expect(schedule).toHaveBeenCalledWith(10080);
  advance(6);
  await backup.run();
  expect(files.size).toBe(1);
  for (let week = 0; week < 8; week++) {
    advance(7);
    await backup.run();
  }
  expect(files.size).toBe(7);
  expect(destination.remove).toHaveBeenCalledTimes(2);
  expect([...files.keys()][0]).toBe(autoBackupName(60 * DAY));
});

test('a failed write preserves the backup date and old files; disabling stops future writes', async () => {
  const { backup, files, destination, advance, settings, schedule } = await setup();
  await backup.enable('daily', 'picked-folder', 'long enough');
  advance(1);
  destination.write.mockRejectedValueOnce(new Error('Folder permission revoked'));
  await expect(backup.run()).rejects.toThrow('Folder permission revoked');
  expect(await settings.getNumber('lastExportAt')).toBe(40 * DAY);
  expect(await settings.get('autoBackupError')).toBe('1');
  expect(files.size).toBe(1);
  expect(destination.remove).not.toHaveBeenCalled();
  await backup.disable();
  await backup.run();
  expect(schedule).toHaveBeenLastCalledWith(null);
  expect(destination.write).toHaveBeenCalledTimes(2);
});

test('failed initial setup stays off and clears the saved passphrase', async () => {
  const { backup, destination, settings, schedule } = await setup();
  destination.write.mockRejectedValueOnce(new Error('No space'));
  await expect(backup.enable('daily', 'folder', 'long enough')).rejects.toThrow('No space');
  expect(await settings.get('autoBackup')).toBeNull();
  expect(await settings.getNumber('lastExportAt')).toBeNull();
  expect(schedule).toHaveBeenLastCalledWith(null);
});

describe('stale backup reminder', () => {
  test('appears only after 30 days with unsaved changes, including deleted notes', async () => {
    const { store, notes, db } = await makeStore();
    const settings = createSettings(db);
    expect(await backupIsStale(settings, store, notes, 40 * DAY)).toBe(false);
    const document = await store.create(fields(), images('passport'));
    expect(await backupIsStale(settings, store, notes, 40 * DAY)).toBe(true);
    await settings.set('lastExportAt', String(document.updatedAt));
    expect(await backupIsStale(settings, store, notes, document.updatedAt + 31 * DAY)).toBe(false);
    const note = await notes.save('note1', { title: '', body: 'Remember' });
    await notes.remove(note.id);
    expect(await backupIsStale(settings, store, notes, document.updatedAt + 30 * DAY)).toBe(false);
    expect(await backupIsStale(settings, store, notes, document.updatedAt + 31 * DAY)).toBe(true);
  });

  test('removing a document after a backup counts as a change', async () => {
    const { store, notes, db } = await makeStore();
    const settings = createSettings(db);
    const document = await store.create(fields(), images('passport'));
    await settings.set('lastExportAt', String(document.updatedAt));
    await store.moveToRecentlyDeleted(document.id);
    expect(await backupIsStale(settings, store, notes, document.updatedAt + 31 * DAY)).toBe(true);
  });
});

test('turning backup off and on in the same folder still keeps only seven files', async () => {
  const { backup, files, advance } = await setup();
  await backup.enable('daily', 'picked-folder', 'long enough');
  for (let day = 0; day < 7; day++) {
    advance(1);
    await backup.disable();
    await backup.enable('daily', 'picked-folder', 'long enough');
  }
  expect(files.size).toBe(7);
});

test('an automatic backup is named by its local date and time, like a manual one (#98)', () => {
  expect(autoBackupName(new Date(2026, 10, 22, 9, 5).getTime())).toBe('DocKeeper-auto-2026-11-22-0905.cardholder');
});

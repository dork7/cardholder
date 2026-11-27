import { makeStore, fields, images } from '../../../../test/fixtures';
import { createSettings } from '../../../storage/settings';
import { decodeBackup } from '../../backupFile';
import { DriveError } from '../driveApi';
import { createDriveBackup, createDriveRestore, loadDriveBackup } from '../driveBackup';
import { fakeAuth, fakeDrive } from '../../../../test/fakeDrive';
import { AuthResult } from '../googleAuth';

const DAY = 86_400_000;

// Like the real client: every call needs a token first, so auth failures surface where they would.
function withToken<T extends object>(client: T, token: (fresh: boolean) => Promise<string>): T {
  return Object.fromEntries(Object.entries(client).map(([name, fn]) =>
    [name, async (...args: unknown[]) => { await token(false); return (fn as (...a: unknown[]) => unknown)(...args); }])) as T;
}
const PASS = 'correct horse battery';

async function setup(authResults: AuthResult[] = []) {
  const { store, notes, db } = await makeStore();
  await store.create(fields({ name: 'Passport' }), images('passport'));
  const settings = createSettings(db);
  const drive = fakeDrive();
  const { auth, setWifi } = fakeAuth(authResults);
  let secret: string | null = null;
  let now = 40 * DAY;
  const schedule = jest.fn(async () => {});
  const notifyOverdue = jest.fn(async () => {});
  const backup = createDriveBackup({
    store, notes, settings, auth, schedule, notifyOverdue,
    connect: (token) => withToken(drive.client, token),
    secret: { get: async () => secret, set: async (value) => { secret = value; } },
    now: () => now,
  });
  const enable = (overrides = {}) => backup.enable({ frequency: 'daily', allowMobileData: false, passphrase: PASS, ...overrides });
  return { backup, enable, drive, auth, setWifi, settings, schedule, notifyOverdue, secret: () => secret,
    advance: (days: number) => { now += days * DAY; }, config: () => loadDriveBackup(settings) };
}

test('enabling asks for the account, creates the folder and uploads a restorable backup', async () => {
  const { enable, drive, auth, schedule, settings, config } = await setup();
  expect(await enable()).toBe('enabled');
  expect(auth.authorize).toHaveBeenCalledWith(true);
  const folder = [...drive.folders][0];
  expect(folder[1].name).toBe('Doc Keeper Backups');
  const [file] = drive.inFolder(folder[0]);
  expect(file.name).toMatch(/^DocKeeper-.*\.cardholder$/);
  expect((await decodeBackup(file.bytes, PASS)).cards[0].card.name).toBe('Passport');
  expect(await config()).toMatchObject({ email: 'someone@example.com', files: [file.id], problem: null });
  expect(await settings.getNumber('lastExportAt')).toBe(40 * DAY);
  expect(schedule).toHaveBeenCalled();
});

test('a short passphrase is refused before anything is asked', async () => {
  const { enable, auth } = await setup();
  await expect(enable({ passphrase: 'short' })).rejects.toThrow(/too short/);
  expect(auth.authorize).not.toHaveBeenCalled();
});

test('closing the account chooser leaves Drive backup off', async () => {
  const { enable, drive, config, secret } = await setup([{ status: 'cancelled' }]);
  expect(await enable()).toBe('cancelled');
  expect(drive.folders.size).toBe(0);
  expect(await config()).toBeNull();
  expect(secret()).toBeNull();
});

test('access removed in the Google account asks to reconnect', async () => {
  const { enable, backup, auth, advance, config } = await setup();
  await enable();
  auth.authorize.mockResolvedValueOnce({ status: 'needs-consent' });
  advance(1);
  expect(await backup.run()).toBe('failed');
  expect(auth.authorize).toHaveBeenLastCalledWith(false);
  expect((await config())!.problem).toBe('reconnect');
});

test('reuses an existing backup folder', async () => {
  const { enable, drive } = await setup();
  const id = await drive.client.createFolder('Doc Keeper Backups');
  await enable();
  expect(drive.folders.size).toBe(1);
  expect(drive.inFolder(id)).toHaveLength(1);
});

test('scheduled runs upload when due and keep only the latest three of their own backups', async () => {
  const { enable, backup, drive, advance } = await setup();
  await enable();
  const folderId = [...drive.folders.keys()][0];
  const own = await drive.client.upload(folderId, 'mine-by-hand.cardholder', new Uint8Array([1]));
  expect(await backup.run()).toBe('not-due');
  for (let day = 0; day < 4; day++) {
    advance(1);
    expect(await backup.run()).toBe('done');
  }
  const names = drive.inFolder(folderId).map((f) => f.id);
  expect(names).toContain(own); // a file the app didn't record is never deleted
  expect(names.filter((id) => id !== own)).toHaveLength(3);
});

test('waits for Wi-Fi unless mobile data is allowed, and warns once when overdue', async () => {
  const { enable, backup, setWifi, advance, notifyOverdue, drive } = await setup();
  await enable();
  setWifi(false);
  advance(1);
  expect(await backup.run()).toBe('waiting-for-wifi');
  expect(notifyOverdue).not.toHaveBeenCalled();
  advance(7);
  expect(await backup.run()).toBe('waiting-for-wifi');
  expect(await backup.run()).toBe('waiting-for-wifi');
  expect(notifyOverdue).toHaveBeenCalledTimes(1);
  expect(notifyOverdue).toHaveBeenCalledWith('waiting-for-wifi');
  await backup.setAllowMobileData(true);
  expect(await backup.run()).toBe('done');
  expect(drive.files.size).toBe(2);
});

test('failures are recorded with what to do, and the warning resets after a success', async () => {
  const { enable, backup, drive, advance, notifyOverdue, config } = await setup();
  await enable();
  advance(1);
  drive.failures.upload = new DriveError('auth');
  expect(await backup.run()).toBe('failed');
  expect((await config())!.problem).toBe('reconnect');
  drive.failures.upload = new DriveError('quota');
  expect(await backup.runNow()).toBe('failed');
  expect((await config())!.problem).toBe('full');
  expect(notifyOverdue).not.toHaveBeenCalled();
  advance(7);
  drive.failures.upload = new DriveError('network');
  expect(await backup.run()).toBe('failed');
  expect(notifyOverdue).toHaveBeenCalledWith('failed');
  delete drive.failures.upload;
  expect(await backup.run()).toBe('done');
  expect(await config()).toMatchObject({ problem: null, warnedAt: null });
});

test('reconnect asks for the account again and backs up straight away', async () => {
  const { enable, backup, auth, drive } = await setup();
  await enable();
  auth.authorize.mockClear();
  expect(await backup.reconnect()).toBe('done');
  expect(auth.authorize).toHaveBeenCalledWith(true);
  expect(drive.files.size).toBe(2);
});

test('a deleted folder is created again', async () => {
  const { enable, backup, drive, advance, config } = await setup();
  await enable();
  drive.folders.clear();
  drive.files.clear();
  advance(1);
  expect(await backup.run()).toBe('done');
  expect(drive.folders.size).toBe(1);
  expect((await config())!.files).toHaveLength(1);
});

test('turning off can keep or delete the Drive backups', async () => {
  const kept = await setup();
  await kept.enable();
  await kept.backup.disable(false);
  expect(kept.drive.files.size).toBe(1);
  expect(await kept.config()).toBeNull();
  expect(kept.secret()).toBeNull();
  expect(kept.drive.client.revoke).toHaveBeenCalled();

  const removed = await setup();
  await removed.enable();
  const folderId = [...removed.drive.folders.keys()][0];
  await removed.backup.disable(true);
  expect(removed.drive.files.size).toBe(0);
  expect(removed.drive.folders.has(folderId)).toBe(false);
  expect(removed.schedule).toHaveBeenCalledTimes(2);
});

test('restore lists backups newest first and downloads one', async () => {
  const drive = fakeDrive();
  const folder = await drive.client.createFolder('Doc Keeper Backups');
  await drive.client.upload(folder, 'DocKeeper-old.cardholder', new Uint8Array([1]));
  await drive.client.upload(folder, 'notes.txt', new Uint8Array([2]));
  const newest = await drive.client.upload(folder, 'DocKeeper-new.cardholder', new Uint8Array([3]));
  const { auth } = fakeAuth();
  const restore = createDriveRestore({ auth, connect: () => drive.client });
  const list = await restore.listBackups();
  expect(list.map((f) => f.name)).toEqual(['DocKeeper-new.cardholder', 'DocKeeper-old.cardholder']);
  expect(await restore.download(newest)).toEqual(new Uint8Array([3]));
});

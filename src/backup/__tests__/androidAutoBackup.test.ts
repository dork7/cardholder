import { makeStore, fields, images } from '../../../test/fixtures';
import { createSettings } from '../../storage/settings';
import { decodeBackup } from '../backupFile';
import { base64 } from '../../crypto/bytes';
import { androidAutoBackup, androidDriveBackup, syncAutoBackup } from '../androidAutoBackup';
import { Services } from '../../app/boot';

var mockTask: () => Promise<number>;
const mockSchedule = jest.fn(async () => {});
const mockUnregister = jest.fn(async () => {});
const mockSecrets = new Map<string, string>();
const mockWrites = new Map<string, string>();
let mockServices: Services;
let mockHasKey = true;

jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));
jest.mock('expo-task-manager', () => ({
  defineTask: (_name: string, task: () => Promise<number>) => { mockTask = task; },
  isTaskRegisteredAsync: async () => false,
}));
jest.mock('expo-background-task', () => ({
  BackgroundTaskStatus: { Available: 2 }, BackgroundTaskResult: { Success: 1, Failed: 2 },
  getStatusAsync: async () => 2,
  registerTaskAsync: (...args: unknown[]) => mockSchedule(...(args as [])),
  unregisterTaskAsync: () => mockUnregister(),
}));
jest.mock('expo-secure-store', () => ({
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'device-only',
  getItemAsync: async (key: string) => mockSecrets.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => { mockSecrets.set(key, value); },
  deleteItemAsync: async (key: string) => { mockSecrets.delete(key); },
}));
jest.mock('expo-file-system/legacy', () => ({
  StorageAccessFramework: { createFileAsync: async (folder: string, name: string) => `${folder}/${name}` },
  EncodingType: { Base64: 'base64' },
  writeAsStringAsync: async (uri: string, data: string) => { mockWrites.set(uri, data); },
  deleteAsync: async (uri: string) => { mockWrites.delete(uri); },
}));
jest.mock('expo-notifications', () => ({ scheduleNotificationAsync: async () => 'id' }));
const mockDrive = { files: new Map<string, Uint8Array>() };
jest.mock('../drive/googleAuth', () => ({
  googleAuth: {
    isAvailable: () => true, isOnUnmeteredNetwork: () => true, clearToken: async () => {},
    authorize: async () => ({ status: 'ok', accessToken: 'token' }),
  },
}));
jest.mock('../drive/driveConnect', () => ({
  connect: () => ({
    userEmail: async () => 'a@b.c', findFolder: async () => 'folder', createFolder: async () => 'folder',
    folderExists: async () => true, list: async () => [], remove: async () => {}, revoke: async () => {},
    upload: async (_folder: string, name: string, bytes: Uint8Array) => { mockDrive.files.set(name, bytes); return name; },
  }),
}));
jest.mock('../../crypto/secureVault', () => ({ secureVault: { get: async () => mockHasKey ? new Uint8Array(32) : null } }));
jest.mock('../../storage/openDatabase', () => ({ openDatabase: async () => mockServices.db }));
jest.mock('../../storage/fileBlobStore', () => ({ createFileBlobStore: () => ({}) }));
jest.mock('../../app/boot', () => ({ boot: async () => ({ status: 'ready', services: mockServices }) }));

beforeEach(async () => {
  jest.clearAllMocks();
  mockSecrets.clear();
  mockWrites.clear();
  mockDrive.files.clear();
  mockHasKey = true;
  const fixture = await makeStore();
  await fixture.store.create(fields({ name: 'Passport' }), images('passport'));
  mockServices = {
    db: fixture.db, blobs: fixture.blobs, vault: { get: async () => null, set: async () => {} },
    store: fixture.store, notes: fixture.notes, settings: createSettings(fixture.db),
    noteEditors: { flushAll: async () => {} } as Services['noteEditors'],
  };
});

test('a headless task restores setup and writes a decryptable backup without mounting React', async () => {
  const controller = androidAutoBackup(mockServices);
  await controller.enable('weekly', 'content://folder', 'long enough');
  expect(mockSchedule).toHaveBeenCalledWith('doc-keeper-auto-backup', { minimumInterval: 10080 });
  const config = JSON.parse((await mockServices.settings.get('autoBackup'))!);
  await mockServices.settings.set('autoBackup', JSON.stringify({ ...config, lastRun: 0 }));
  mockWrites.clear();
  expect(await mockTask()).toBe(1);
  const snapshot = await decodeBackup(base64.decode([...mockWrites.values()][0]), 'long enough');
  expect(snapshot.cards[0].card.name).toBe('Passport');
});

test('disabling erases the secure passphrase and prevents background writes', async () => {
  await androidAutoBackup(mockServices).enable('daily', 'content://folder', 'long enough');
  await androidAutoBackup(mockServices).disable();
  expect(mockSecrets.size).toBe(0);
  mockWrites.clear();
  expect(await mockTask()).toBe(1);
  expect(mockWrites.size).toBe(0);
});

test('a lost device key never creates a backup or initializes replacement data', async () => {
  mockHasKey = false;
  expect(await mockTask()).toBe(2);
  expect(mockWrites.size).toBe(0);
});

test('foreground catch-up registers a missed schedule and saves a due backup', async () => {
  await androidAutoBackup(mockServices).enable('daily', 'content://folder', 'long enough');
  const config = JSON.parse((await mockServices.settings.get('autoBackup'))!);
  await mockServices.settings.set('autoBackup', JSON.stringify({ ...config, lastRun: 0 }));
  mockWrites.clear();
  await syncAutoBackup(mockServices);
  expect(mockWrites.size).toBe(1);
});

test('Drive backup shares the background task, which stays while either backup is on', async () => {
  await androidAutoBackup(mockServices).enable('weekly', 'content://folder', 'long enough');
  await androidDriveBackup(mockServices).enable({ frequency: 'daily', allowMobileData: false, passphrase: 'a long drive passphrase' });
  expect(mockSchedule).toHaveBeenLastCalledWith('doc-keeper-auto-backup', { minimumInterval: 1440 });
  await androidAutoBackup(mockServices).disable();
  expect(mockSchedule).toHaveBeenLastCalledWith('doc-keeper-auto-backup', { minimumInterval: 1440 });
  expect(mockUnregister).not.toHaveBeenCalled();

  const config = JSON.parse((await mockServices.settings.get('driveBackup'))!);
  await mockServices.settings.set('driveBackup', JSON.stringify({ ...config, lastRun: 0 }));
  mockDrive.files.clear();
  expect(await mockTask()).toBe(1);
  const [bytes] = [...mockDrive.files.values()];
  expect((await decodeBackup(bytes, 'a long drive passphrase')).cards[0].card.name).toBe('Passport');

  await androidDriveBackup(mockServices).disable(false);
  expect(mockSecrets.size).toBe(0);
});

import { UpdateManifest } from '../manifest';
import * as store from '../updateStore';

const manifest: UpdateManifest = {
  versionCode: 1000007,
  versionName: '1.0.7',
  apkUrl: 'https://github.com/dork7/cardholder/releases/download/v1.0.7/DocKeeper-1.0.7.apk',
  releaseNotes: '- new things',
  sha256: 'ab'.repeat(32),
  size: 150_000_000,
};

let mockInstalled = 1000006;
let mockFetch: () => Promise<UpdateManifest>;
let mockDownload: { progress: (f: number | null) => void; resolve: (uri: string) => void; reject: (e: unknown) => void };
let mockCanInstall = true;
const mockInstall = jest.fn();
const mockOpenPermission = jest.fn();
jest.mock('../download', () => {
  class UpdateNetworkError extends Error {}
  class BadReleaseError extends Error {}
  class UpdateCheckError extends Error {}
  return {
    UpdateNetworkError,
    BadReleaseError,
    UpdateCheckError,
    installedVersionCode: () => mockInstalled,
    fetchManifest: () => mockFetch(),
    downloadApk: (_m: UpdateManifest, progress: (f: number | null) => void, signal?: AbortSignal) =>
      new Promise<string>((resolve, reject) => {
        mockDownload = { progress, resolve, reject };
        signal?.addEventListener('abort', () => reject(new Error('aborted')));
      }),
    canInstall: () => mockCanInstall,
    install: (uri: string) => mockInstall(uri),
    openInstallPermission: () => mockOpenPermission(),
  };
});
const { BadReleaseError, UpdateCheckError } = jest.requireMock('../download');

beforeEach(() => {
  store.resetUpdateState();
  mockInstalled = 1000006;
  mockFetch = async () => manifest;
  mockCanInstall = true;
  mockInstall.mockClear();
  mockOpenPermission.mockClear();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

const flush = () => new Promise((r) => setImmediate(r));

test('offers a newer release', async () => {
  await store.checkForUpdate();
  expect(store.getUpdateState()).toEqual({ status: 'available', manifest });
});

test('says so when the installed version is the latest', async () => {
  mockInstalled = 1000007;
  await store.checkForUpdate();
  expect(store.getUpdateState()).toEqual({ status: 'up-to-date' });
});

test('a failed check says why', async () => {
  mockFetch = async () => {
    throw new Error('offline');
  };
  await store.checkForUpdate();
  expect(store.getUpdateState()).toEqual({ status: 'idle', failure: 'network' });
  mockFetch = async () => {
    throw new BadReleaseError('no sha');
  };
  await store.checkForUpdate();
  expect(store.getUpdateState()).toEqual({ status: 'idle', failure: 'bad-release' });
});

test('downloads with progress in whole percents, then is ready to install', async () => {
  await store.checkForUpdate();
  const done = store.downloadUpdate();
  mockDownload.progress(0.421);
  expect(store.getUpdateState()).toEqual({ status: 'downloading', manifest, progress: 0.42 });
  mockDownload.resolve('file:///cache/updates/DocKeeper-1.0.7.apk');
  await done;
  expect(store.getUpdateState()).toEqual({
    status: 'ready',
    manifest,
    file: 'file:///cache/updates/DocKeeper-1.0.7.apk',
    needsPermission: false,
  });
  store.installUpdate();
  expect(mockInstall).toHaveBeenCalledWith('file:///cache/updates/DocKeeper-1.0.7.apk');
});

test('stopping the download goes back to the offer', async () => {
  await store.checkForUpdate();
  const done = store.downloadUpdate();
  await flush();
  store.cancelUpdateDownload();
  await done;
  expect(store.getUpdateState()).toEqual({ status: 'available', manifest });
});

test('a download that fails its check is not installed, and says so', async () => {
  await store.checkForUpdate();
  const done = store.downloadUpdate();
  mockDownload.reject(new UpdateCheckError('mismatch'));
  await done;
  expect(store.getUpdateState()).toEqual({ status: 'available', manifest, failure: 'check' });
  expect(mockInstall).not.toHaveBeenCalled();
});

test('without permission to install, opens Android’s page for it instead; Install works once allowed', async () => {
  mockCanInstall = false;
  await store.checkForUpdate();
  const done = store.downloadUpdate();
  mockDownload.resolve('file:///apk');
  await done;
  expect(store.getUpdateState()).toMatchObject({ status: 'ready', needsPermission: true });

  store.installUpdate();
  expect(mockOpenPermission).toHaveBeenCalled();
  expect(mockInstall).not.toHaveBeenCalled();

  mockCanInstall = true;
  store.refreshInstallPermission();
  expect(store.getUpdateState()).toMatchObject({ status: 'ready', needsPermission: false });
  store.installUpdate();
  expect(mockInstall).toHaveBeenCalledWith('file:///apk');
});

test('if the installer will not open, the update is offered again with a reason', async () => {
  await store.checkForUpdate();
  const done = store.downloadUpdate();
  mockDownload.resolve('file:///apk');
  await done;
  mockInstall.mockImplementationOnce(() => {
    throw new Error('no activity');
  });
  store.installUpdate();
  expect(store.getUpdateState()).toEqual({ status: 'available', manifest, failure: 'install' });
});

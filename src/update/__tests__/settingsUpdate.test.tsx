import { fireEvent, render, screen } from '@testing-library/react-native';
import SettingsScreen from '../../../app/settings';
import { strings } from '../../strings';
import { UpdateManifest } from '../manifest';
import { UpdateState } from '../updateStore';

let mockCanSelfUpdate = true;
const mockClear = jest.fn();
jest.mock('../download', () =>
  Object.defineProperty({ clearDownloads: () => mockClear() }, 'canSelfUpdate', { get: () => mockCanSelfUpdate }),
);
let mockState: UpdateState = { status: 'idle' };
const mockCheck = jest.fn(async () => {});
const mockDownload = jest.fn(async () => {});
const mockStop = jest.fn();
const mockInstall = jest.fn();
const mockRefreshPermission = jest.fn();
jest.mock('../updateStore', () => ({
  useUpdateState: () => mockState,
  getUpdateState: () => mockState,
  checkForUpdate: () => mockCheck(),
  downloadUpdate: () => mockDownload(),
  cancelUpdateDownload: () => mockStop(),
  installUpdate: () => mockInstall(),
  refreshInstallPermission: () => mockRefreshPermission(),
}));
jest.mock('../../analysis/recognizer', () => ({ canReadText: false }));
jest.mock('../../security/deviceAuth', () => ({ authenticate: jest.fn(), deviceLockAvailable: jest.fn() }));
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    useRouter: () => ({ push: jest.fn() }),
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});
const mockServices = { settings: { getNumber: () => Promise.resolve(null) } };
jest.mock('../../app/AppProvider', () => ({
  useApp: () => ({
    services: mockServices,
    appLock: false,
    setAppLock: jest.fn(),
    homeFolders: { filter: true, manage: true },
    setHomeFolders: jest.fn(),
  }),
}));

const manifest: UpdateManifest = {
  versionCode: 1000007,
  versionName: '1.0.7',
  apkUrl: 'https://github.com/dork7/cardholder/releases/download/v1.0.7/DocKeeper-1.0.7.apk',
  releaseNotes: '- feat: in-app updates',
  sha256: 'ab'.repeat(32),
  size: 154_500_000,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCanSelfUpdate = true;
  mockState = { status: 'idle' };
});

test('not offered where the app cannot update itself (iOS, older builds)', async () => {
  mockCanSelfUpdate = false;
  await render(<SettingsScreen />);
  expect(screen.queryByText(strings.update.title)).toBeNull();
});

test('nothing is fetched until the user taps Check; then it checks', async () => {
  await render(<SettingsScreen />);
  expect(screen.getByText(strings.update.about)).toBeTruthy();
  expect(mockCheck).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByTestId('check-update'));
  expect(mockCheck).toHaveBeenCalledTimes(1);
  expect(mockClear).toHaveBeenCalled(); // an old APK is cleared when nothing is in progress
});

test('up to date', async () => {
  mockState = { status: 'up-to-date' };
  await render(<SettingsScreen />);
  expect(screen.getByTestId('update-current')).toHaveTextContent(strings.update.upToDate);
});

test('a newer version shows its notes and size, and downloads on request', async () => {
  mockState = { status: 'available', manifest };
  await render(<SettingsScreen />);
  expect(screen.getByTestId('update-version')).toHaveTextContent(strings.update.available('1.0.7'));
  expect(screen.getByTestId('update-notes')).toHaveTextContent('- feat: in-app updates', { exact: false });
  expect(screen.getByText(strings.update.download(155))).toBeTruthy();
  await fireEvent.press(screen.getByTestId('download-update'));
  expect(mockDownload).toHaveBeenCalled();
});

test('shows progress, and the download can be stopped', async () => {
  mockState = { status: 'downloading', manifest, progress: 0.37 };
  await render(<SettingsScreen />);
  expect(screen.getByTestId('update-progress')).toHaveTextContent(strings.update.downloading(37));
  await fireEvent.press(screen.getByTestId('stop-update'));
  expect(mockStop).toHaveBeenCalled();
  expect(mockClear).not.toHaveBeenCalled(); // never clears a download in progress
});

test('once downloaded, Install opens the installer; the permission step is explained when needed', async () => {
  mockState = { status: 'ready', manifest, file: 'file:///apk', needsPermission: true };
  await render(<SettingsScreen />);
  expect(screen.getByTestId('update-version')).toHaveTextContent(strings.update.ready('1.0.7'));
  expect(screen.getByTestId('update-permission')).toHaveTextContent(strings.update.permissionHint);
  expect(screen.getByText(strings.update.keepsCards)).toBeTruthy();
  await fireEvent.press(screen.getByTestId('install-update'));
  expect(mockInstall).toHaveBeenCalled();
});

test('says why something failed', async () => {
  mockState = { status: 'available', manifest, failure: 'check' };
  await render(<SettingsScreen />);
  expect(screen.getByTestId('update-failed')).toHaveTextContent(strings.update.failed.check);
});

test('re-checks the install permission when the app comes back from Android\'s settings', async () => {
  const { AppState } = jest.requireActual('react-native');
  const listeners: ((state: string) => void)[] = [];
  const spy = jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    listeners.push(listener as (state: string) => void);
    return { remove: () => {} };
  });
  mockState = { status: 'ready', manifest, file: 'file:///apk', needsPermission: true };
  await render(<SettingsScreen />);
  expect(mockRefreshPermission).not.toHaveBeenCalled();
  listeners.forEach((l) => l('background'));
  expect(mockRefreshPermission).not.toHaveBeenCalled();
  listeners.forEach((l) => l('active'));
  expect(mockRefreshPermission).toHaveBeenCalled();
  spy.mockRestore();
});

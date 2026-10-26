import { fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import SettingsScreen from '../../../app/settings';
import { strings } from '../../strings';

const mockAuthenticate = jest.fn();
const mockAvailable = jest.fn();
// Folders are hidden in the app for now (FOLDERS_ENABLED); these tests cover both ways.
let mockFoldersEnabled = true;
jest.mock('../../config', () =>
  Object.defineProperty({ ...jest.requireActual('../../config') }, 'FOLDERS_ENABLED', {
    get: () => mockFoldersEnabled,
  }),
);
jest.mock('../deviceAuth', () => ({
  authenticate: (...a: unknown[]) => mockAuthenticate(...a),
  deviceLockAvailable: () => mockAvailable(),
}));
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    useRouter: () => ({ push: jest.fn() }),
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});
let mockAppLock = false;
const mockSetAppLock = jest.fn(async (on: boolean) => {
  mockAppLock = on;
});
const mockSetHomeFolders = jest.fn(() => Promise.resolve());
const mockServices = { settings: { getNumber: () => Promise.resolve(null) } };
jest.mock('../../app/AppProvider', () => ({
  useApp: () => ({
    services: mockServices,
    appLock: mockAppLock,
    setAppLock: mockSetAppLock,
    homeFolders: { filter: true, manage: true },
    setHomeFolders: mockSetHomeFolders,
  }),
}));

let alert: jest.SpyInstance;
beforeEach(() => {
  jest.clearAllMocks();
  mockFoldersEnabled = true;
  mockAppLock = false;
  mockAvailable.mockResolvedValue(true);
  mockAuthenticate.mockResolvedValue('success');
  alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => alert.mockRestore());

const flip = (on: boolean) => fireEvent(screen.getByTestId('app-lock-switch'), 'valueChange', on);

test('turning the lock on asks the phone first', async () => {
  await render(<SettingsScreen />);
  await flip(true);
  expect(mockAuthenticate).toHaveBeenCalledWith(strings.lock.confirmOn, strings.common.cancel);
  expect(mockSetAppLock).toHaveBeenCalledWith(true);
});

test('a cancelled prompt changes nothing', async () => {
  mockAuthenticate.mockResolvedValue('failed');
  await render(<SettingsScreen />);
  await flip(true);
  expect(mockSetAppLock).not.toHaveBeenCalled();
});

test('a phone without a passcode or biometrics is told to set one up first', async () => {
  mockAvailable.mockResolvedValue(false);
  await render(<SettingsScreen />);
  await flip(true);
  expect(alert).toHaveBeenCalledWith(strings.settings.noDeviceLock);
  expect(mockAuthenticate).not.toHaveBeenCalled();
  expect(mockSetAppLock).not.toHaveBeenCalled();
});

test('turning it off also needs the phone lock, unless the phone no longer has one', async () => {
  mockAppLock = true;
  await render(<SettingsScreen />);
  await flip(false);
  expect(mockAuthenticate).toHaveBeenCalledWith(strings.lock.confirmOff, strings.common.cancel);
  expect(mockSetAppLock).toHaveBeenCalledWith(false);

  mockAuthenticate.mockResolvedValue('no-device-lock');
  mockSetAppLock.mockClear();
  await flip(false);
  expect(mockSetAppLock).toHaveBeenCalledWith(false);
});

test('the home screen folder options switch independently', async () => {
  await render(<SettingsScreen />);
  await fireEvent(screen.getByTestId('home-folder-filter-switch'), 'valueChange', false);
  expect(mockSetHomeFolders).toHaveBeenCalledWith({ filter: false, manage: true });
  await fireEvent(screen.getByTestId('home-manage-folders-switch'), 'valueChange', false);
  expect(mockSetHomeFolders).toHaveBeenCalledWith({ filter: true, manage: false });
});

test('with folders hidden, settings has no folder options', async () => {
  mockFoldersEnabled = false;
  await render(<SettingsScreen />);
  expect(screen.queryByTestId('home-folder-filter-switch')).toBeNull();
  expect(screen.queryByTestId('manage-folders')).toBeNull();
});

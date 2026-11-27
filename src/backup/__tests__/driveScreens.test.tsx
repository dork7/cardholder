import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert, Platform } from 'react-native';
import DriveBackupScreen from '../../../app/drive-backup';
import ImportScreen from '../../../app/import';
import { strings } from '../../strings';
import { DriveError } from '../drive/driveApi';

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn(), dismissAll: jest.fn() }) }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('expo-file-system', () => ({ File: class {} }));

const mockSettings = new Map<string, string>();
const mockServices = {
  noteEditors: { flushAll: async () => {} },
  settings: {
    get: async (key: string) => mockSettings.get(key) ?? null,
    getNumber: async () => null,
    set: async (key: string, value: string) => void mockSettings.set(key, value),
    remove: async (key: string) => void mockSettings.delete(key),
  },
};
jest.mock('../../app/AppProvider', () => ({ useApp: () => ({ services: mockServices, refresh: async () => {} }) }));

const mockController = {
  enable: jest.fn(), runNow: jest.fn(), reconnect: jest.fn(), setAllowMobileData: jest.fn(), disable: jest.fn(),
};
jest.mock('../androidAutoBackup', () => ({
  canDriveBackup: () => true,
  androidDriveBackup: () => mockController,
}));
const mockRestore = { listBackups: jest.fn(), download: jest.fn() };
jest.mock('../drive/driveConnect', () => ({ canRestoreFromDrive: () => true, driveRestore: () => mockRestore }));

const enabledConfig = (overrides = {}) => JSON.stringify({
  frequency: 'daily', allowMobileData: false, email: 'someone@example.com', folderId: 'f', files: ['a'],
  lastRun: Date.now(), problem: null, warnedAt: null, ...overrides,
});
const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

beforeEach(() => {
  jest.clearAllMocks();
  mockSettings.clear();
  Platform.OS = 'android';
});

describe('Drive backup screen', () => {
  const fill = async (passphrase: string, confirmation = passphrase) => {
    await fireEvent.changeText(await screen.findByTestId('drive-passphrase'), passphrase);
    await fireEvent.changeText(screen.getByTestId('drive-confirm'), confirmation);
  };

  test('a passphrase under 12 characters is refused before Google is asked', async () => {
    await render(<DriveBackupScreen />);
    await fill('too short');
    await act(async () => fireEvent.press(screen.getByTestId('drive-enable')));
    expect(screen.getByText(strings.driveBackup.tooShort(12))).toBeTruthy();
    expect(mockController.enable).not.toHaveBeenCalled();
  });

  test('turning on passes the chosen setup and shows the account afterwards', async () => {
    mockController.enable.mockImplementation(async () => { mockSettings.set('driveBackup', enabledConfig()); return 'enabled'; });
    await render(<DriveBackupScreen />);
    await act(async () => fireEvent(screen.getByTestId('drive-mobile-data'), 'valueChange', true));
    await fill('correct horse battery');
    await act(async () => fireEvent.press(screen.getByTestId('drive-enable')));
    expect(mockController.enable).toHaveBeenCalledWith({ frequency: 'daily', allowMobileData: true, passphrase: 'correct horse battery' });
    expect(alert).toHaveBeenCalledWith(strings.driveBackup.saved);
    expect(screen.getByTestId('drive-status')).toHaveTextContent(strings.driveBackup.on('daily', 'someone@example.com'));
  });

  test('closing the account chooser changes nothing', async () => {
    mockController.enable.mockResolvedValue('cancelled');
    await render(<DriveBackupScreen />);
    await fill('correct horse battery');
    await act(async () => fireEvent.press(screen.getByTestId('drive-enable')));
    expect(alert).not.toHaveBeenCalled();
    expect(screen.getByTestId('drive-status')).toHaveTextContent(strings.driveBackup.off);
  });

  test('lost access offers reconnect instead of back up now', async () => {
    mockSettings.set('driveBackup', enabledConfig({ problem: 'reconnect' }));
    mockController.reconnect.mockImplementation(async () => { mockSettings.set('driveBackup', enabledConfig()); return 'done'; });
    await render(<DriveBackupScreen />);
    expect(await screen.findByText(strings.driveBackup.problem.reconnect)).toBeTruthy();
    expect(screen.queryByTestId('drive-now')).toBeNull();
    await act(async () => fireEvent.press(screen.getByTestId('drive-reconnect')));
    expect(screen.getByText(strings.driveBackup.backedUp)).toBeTruthy();
    expect(screen.getByTestId('drive-now')).toBeTruthy();
  });

  test('turning off asks whether to keep the Drive backups', async () => {
    mockSettings.set('driveBackup', enabledConfig());
    await render(<DriveBackupScreen />);
    await act(async () => fireEvent.press(await screen.findByTestId('drive-disable')));
    const buttons = alert.mock.calls[0][2]!;
    await act(async () => buttons.find((b) => b.text === strings.driveBackup.keep)!.onPress!());
    expect(mockController.disable).toHaveBeenCalledWith(false);
  });
});

describe('restore from Google Drive', () => {
  const file = { id: 'b1', name: 'DocKeeper-x.cardholder', size: 2_097_152, createdTime: '2026-11-20T10:00:00Z' };

  test('lists the backups and opens the chosen one for its passphrase', async () => {
    mockRestore.listBackups.mockResolvedValue([file]);
    mockRestore.download.mockResolvedValue(new Uint8Array([1]));
    await render(<ImportScreen />);
    await act(async () => fireEvent.press(screen.getByTestId('import-drive')));
    await act(async () => fireEvent.press(screen.getByTestId('import-drive-b1')));
    expect(mockRestore.download).toHaveBeenCalledWith('b1');
    expect(screen.getByTestId('import-passphrase')).toBeTruthy();
  });

  test('says so when the account has no backups', async () => {
    mockRestore.listBackups.mockResolvedValue([]);
    await render(<ImportScreen />);
    await act(async () => fireEvent.press(screen.getByTestId('import-drive')));
    expect(screen.getByText(strings.driveBackup.restoreNone)).toBeTruthy();
  });

  test('closing the account chooser returns quietly; a failure says what happened', async () => {
    mockRestore.listBackups.mockRejectedValueOnce(new DriveError('cancelled')).mockRejectedValueOnce(new DriveError('network'));
    await render(<ImportScreen />);
    await act(async () => fireEvent.press(screen.getByTestId('import-drive')));
    expect(screen.queryByTestId('import-error')).toBeNull();
    await act(async () => fireEvent.press(screen.getByTestId('import-drive')));
    expect(screen.getByTestId('import-error')).toHaveTextContent(strings.driveBackup.restoreFailed);
  });
});

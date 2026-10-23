import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { backupSnapshot } from '../../../test/fixtures';
import ExportScreen from '../../../app/export';
import ImportScreen from '../../../app/import';
import SettingsScreen from '../../../app/settings';
import { MIN_PASSPHRASE_LENGTH } from '../../config';
import { strings } from '../../strings';
import { BackupError } from '../backupFile';

const mockRouter = { back: jest.fn(), push: jest.fn(), dismissAll: jest.fn() };
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    useRouter: () => mockRouter,
    useFocusEffect: (effect: () => void | (() => void)) => useEffect(effect, [effect]),
  };
});

const mockSettings = new Map<string, string>();
const mockRefresh = jest.fn(() => Promise.resolve());
const mockServices = {
  store: {},
  settings: {
    getNumber: async (key: string) => (mockSettings.has(key) ? Number(mockSettings.get(key)) : null),
    set: async (key: string, value: string) => void mockSettings.set(key, value),
    remove: async (key: string) => void mockSettings.delete(key),
  },
};
jest.mock('../../app/AppProvider', () => ({ useApp: () => ({ services: mockServices, refresh: mockRefresh }) }));

const mockEncode = jest.fn(async () => new Uint8Array([1, 2, 3]));
const mockDecode = jest.fn();
jest.mock('../backupFile', () => ({
  ...jest.requireActual('../backupFile'),
  encodeBackup: (...args: unknown[]) => mockEncode(...(args as [])),
  decodeBackup: (...args: unknown[]) => mockDecode(...args),
}));
const mockApply = jest.fn();
jest.mock('../backupService', () => ({
  buildSnapshot: async () => ({}),
  applySnapshot: (...args: unknown[]) => mockApply(...args),
}));
const mockShare = jest.fn(async () => {});
jest.mock('../../share/shareCard', () => ({ shareBackupFile: (...args: unknown[]) => mockShare(...(args as [])) }));

const mockPick = jest.fn();
jest.mock('expo-document-picker', () => ({ getDocumentAsync: (...args: unknown[]) => mockPick(...args) }));
const mockDeleted: string[] = [];
jest.mock('expo-file-system', () => ({
  File: class {
    uri: string;
    constructor(path: string) {
      this.uri = path;
    }
    async bytes() {
      return new Uint8Array([9]);
    }
    delete() {
      mockDeleted.push(this.uri);
    }
  },
}));

const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

beforeEach(() => {
  jest.clearAllMocks();
  mockSettings.clear();
  mockDeleted.length = 0;
});

describe('export', () => {
  const fill = async (passphrase: string, confirmation: string) => {
    await fireEvent.changeText(screen.getByTestId('export-passphrase'), passphrase);
    await fireEvent.changeText(screen.getByTestId('export-confirm'), confirmation);
    await act(async () => fireEvent.press(screen.getByTestId('export-run')));
  };

  test('a short passphrase is refused before anything is encrypted', async () => {
    await render(<ExportScreen />);
    await fill('short', 'short');
    expect(screen.getByText(strings.export.tooShort(MIN_PASSPHRASE_LENGTH))).toBeTruthy();
    expect(mockEncode).not.toHaveBeenCalled();
  });

  test('mismatched passphrases are refused', async () => {
    await render(<ExportScreen />);
    await fill('long enough', 'long enougH');
    expect(screen.getByText(strings.export.mismatch)).toBeTruthy();
    expect(mockEncode).not.toHaveBeenCalled();
  });

  test('a good passphrase encrypts, shares and records the export', async () => {
    await render(<ExportScreen />);
    await fill('long enough', 'long enough');
    expect(mockEncode).toHaveBeenCalledWith({}, 'long enough');
    expect(mockShare).toHaveBeenCalledWith(new Uint8Array([1, 2, 3]), expect.any(Date));
    expect(mockSettings.get('lastExportAt')).toEqual(expect.any(String));
    expect(alert).toHaveBeenCalledWith(strings.export.done);
    expect(mockRouter.back).toHaveBeenCalled();
  });

  test('a failed share leaves the last backup date alone', async () => {
    mockShare.mockRejectedValueOnce(new Error('no share sheet'));
    await render(<ExportScreen />);
    await fill('long enough', 'long enough');
    expect(mockSettings.has('lastExportAt')).toBe(false);
    expect(alert).toHaveBeenCalledWith(strings.export.failed);
    expect(mockRouter.back).not.toHaveBeenCalled();
  });
});

describe('import', () => {
  const pickAndUnlock = async (passphrase: string) => {
    mockPick.mockResolvedValue({ canceled: false, assets: [{ uri: 'cache/pick/b.cardholder', name: 'b.cardholder' }] });
    await render(<ImportScreen />);
    await act(async () => fireEvent.press(screen.getByTestId('import-pick')));
    await fireEvent.changeText(screen.getByTestId('import-passphrase'), passphrase);
    await act(async () => fireEvent.press(screen.getByTestId('import-unlock')));
  };

  test('the picked file is read, then its cache copy removed', async () => {
    await pickAndUnlock('');
    expect(screen.getByText(strings.import.fileChosen('b.cardholder'))).toBeTruthy();
    expect(mockDeleted).toEqual(['cache/pick/b.cardholder']);
  });

  test('a wrong passphrase says so and stays on the passphrase step', async () => {
    mockDecode.mockRejectedValue(new BackupError('wrong-passphrase-or-damaged'));
    await pickAndUnlock('nope nope');
    expect(screen.getByTestId('import-error').props.children).toBe(strings.import.errors['wrong-passphrase-or-damaged']);
    expect(screen.getByTestId('import-passphrase')).toBeTruthy();
  });

  test('merge applies the backup, counts it as a backup on a fresh phone, and returns home', async () => {
    const snapshot = backupSnapshot();
    mockDecode.mockResolvedValue(snapshot);
    mockApply.mockResolvedValue({ added: 1, skipped: 1 });
    await pickAndUnlock('right one');
    expect(mockDecode).toHaveBeenCalledWith(new Uint8Array([9]), 'right one');
    expect(screen.getByTestId('import-summary')).toBeTruthy();
    await act(async () => fireEvent.press(screen.getByRole('button', { name: strings.import.merge })));
    expect(mockApply).toHaveBeenCalledWith(mockServices.store, snapshot, 'merge');
    expect(mockSettings.get('lastExportAt')).toBe(String(snapshot.exportedAt));
    expect(mockRefresh).toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith(strings.import.done(1, 1));
    expect(mockRouter.dismissAll).toHaveBeenCalled();
  });

  test('replace asks first', async () => {
    mockDecode.mockResolvedValue(backupSnapshot());
    await pickAndUnlock('right one');
    await fireEvent.press(screen.getByRole('button', { name: strings.import.replace }));
    expect(alert).toHaveBeenCalledWith(strings.import.replaceConfirmTitle, strings.import.replaceConfirmBody, expect.any(Array));
    expect(mockApply).not.toHaveBeenCalled();
  });
});

describe('settings', () => {
  test('says when there has never been a backup', async () => {
    await render(<SettingsScreen />);
    expect(await screen.findByText(strings.settings.neverBackedUp)).toBeTruthy();
  });

  test('shows how long ago the last backup was, and links to the backup screens', async () => {
    mockSettings.set('lastExportAt', String(Date.now()));
    await render(<SettingsScreen />);
    expect(await screen.findByText(strings.settings.lastBackup(strings.ago.today))).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: strings.settings.exportBackup }));
    expect(mockRouter.push).toHaveBeenLastCalledWith('/export');
    await fireEvent.press(screen.getByRole('button', { name: strings.settings.importBackup }));
    expect(mockRouter.push).toHaveBeenLastCalledWith('/import');
    await fireEvent.press(screen.getByRole('button', { name: strings.settings.privacyPolicy }));
    expect(mockRouter.push).toHaveBeenLastCalledWith('/privacy');
  });
});

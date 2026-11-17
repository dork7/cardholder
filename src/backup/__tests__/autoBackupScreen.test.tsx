import { act, fireEvent, render, screen } from '@testing-library/react-native';
import AutoBackupScreen from '../../../app/auto-backup';
import { MIN_PASSPHRASE_LENGTH } from '../../config';
import { strings } from '../../strings';

const mockValues = new Map<string, string>();
const mockFlush = jest.fn(async () => {});
const mockPick = jest.fn(async (): Promise<string | null> => 'chosen-folder');
const mockEnable = jest.fn(async (frequency: string, folder: string, _passphrase: string) => {
  mockValues.set('autoBackup', JSON.stringify({ frequency, folder, lastRun: 1000, files: [] }));
});
const mockDisable = jest.fn(async () => { mockValues.delete('autoBackup'); });
const mockServices = {
  settings: { get: async (key: string) => mockValues.get(key) ?? null },
  noteEditors: { flushAll: mockFlush },
};
jest.mock('../../app/AppProvider', () => ({ useApp: () => ({ services: mockServices }) }));
jest.mock('../androidAutoBackup', () => ({
  canAutoBackup: true,
  pickBackupFolder: () => mockPick(),
  androidAutoBackup: () => ({ enable: mockEnable, disable: mockDisable }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockValues.clear();
});
const fill = async () => {
  await fireEvent.changeText(screen.getByTestId('auto-passphrase'), 'my long passphrase');
  await fireEvent.changeText(screen.getByTestId('auto-confirm'), 'my long passphrase');
};

test('validates a passphrase before asking for folder access', async () => {
  await render(<AutoBackupScreen />);
  await screen.findByTestId('auto-enable');
  await fireEvent.press(screen.getByTestId('auto-enable'));
  expect(screen.getByText(strings.export.tooShort(MIN_PASSPHRASE_LENGTH))).toBeTruthy();
  expect(mockPick).not.toHaveBeenCalled();
});

test('cancelling the folder picker leaves automatic backup off', async () => {
  mockPick.mockResolvedValueOnce(null);
  await render(<AutoBackupScreen />);
  await screen.findByTestId('auto-enable');
  await fill();
  await act(async () => fireEvent.press(screen.getByTestId('auto-enable')));
  expect(mockEnable).not.toHaveBeenCalled();
  expect(screen.getByText(strings.autoBackup.off)).toBeTruthy();
});

test('enables the selected schedule after flushing edits, then can turn it off', async () => {
  await render(<AutoBackupScreen />);
  await screen.findByTestId('auto-enable');
  await fill();
  await fireEvent.press(screen.getByTestId('auto-daily'));
  await act(async () => fireEvent.press(screen.getByTestId('auto-enable')));
  expect(mockFlush).toHaveBeenCalled();
  expect(mockEnable).toHaveBeenCalledWith('daily', 'chosen-folder', 'my long passphrase');
  expect(mockFlush.mock.invocationCallOrder[0]).toBeLessThan(mockEnable.mock.invocationCallOrder[0]);
  expect(screen.getByText(strings.autoBackup.active(strings.autoBackup.daily))).toBeTruthy();
  expect(screen.queryByTestId('auto-passphrase')).toBeNull();
  await act(async () => fireEvent.press(screen.getByTestId('auto-disable')));
  expect(mockDisable).toHaveBeenCalled();
  expect(screen.getByTestId('auto-passphrase').props.value).toBe('');
});

test('a failed setup explains the failure and allows retry', async () => {
  mockEnable.mockRejectedValueOnce(new Error('Folder is read-only'));
  await render(<AutoBackupScreen />);
  await screen.findByTestId('auto-enable');
  await fill();
  await act(async () => fireEvent.press(screen.getByTestId('auto-enable')));
  expect(screen.getByText(strings.autoBackup.failed)).toBeTruthy();
  expect(screen.getByTestId('auto-enable')).toBeTruthy();
});

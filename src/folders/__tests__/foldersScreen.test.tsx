import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { makeCard } from '../../../test/fixtures';
import FoldersScreen from '../../../app/folders';
import { Folder } from '../../cards/types';
import { strings } from '../../strings';

let mockFolders: Folder[] = [];
const mockCreateFolder = jest.fn();
const mockRenameFolder = jest.fn();
const mockRemoveFolder = jest.fn();
const mockRefresh = jest.fn();
const mockCards = [makeCard({ id: 'c1', folderId: 'f1' }), makeCard({ id: 'c2', folderId: 'f1' }), makeCard({ id: 'c3' })];

jest.mock('../../app/AppProvider', () => ({
  useApp: () => ({
    services: {
      store: {
        createFolder: (...a: unknown[]) => mockCreateFolder(...a),
        renameFolder: (...a: unknown[]) => mockRenameFolder(...a),
        removeFolder: (...a: unknown[]) => mockRemoveFolder(...a),
      },
    },
    cards: mockCards,
    folders: mockFolders,
    refresh: () => mockRefresh(),
  }),
}));

let alert: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  mockFolders = [{ id: 'f1', name: 'Family', createdAt: 1 }];
  for (const m of [mockCreateFolder, mockRenameFolder, mockRemoveFolder, mockRefresh]) m.mockResolvedValue(undefined);
  alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => alert.mockRestore());

test('shows each folder with how many cards it holds', async () => {
  await render(<FoldersScreen />);
  expect(screen.getByText('Family')).toBeTruthy();
  expect(screen.getByText(strings.folders.count(2))).toBeTruthy();
});

test('says so when there are no folders', async () => {
  mockFolders = [];
  await render(<FoldersScreen />);
  expect(screen.getByTestId('no-folders')).toBeTruthy();
});

test('creates a folder, refusing a name already taken', async () => {
  await render(<FoldersScreen />);
  await fireEvent.press(screen.getByTestId('new-folder'));
  await fireEvent.changeText(screen.getByTestId('new-folder-name'), 'FAMILY');
  await fireEvent.press(screen.getByTestId('new-folder-submit'));
  expect(screen.getByText(strings.folders.errors.duplicate)).toBeTruthy();
  expect(mockCreateFolder).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByTestId('new-folder-name'), ' Work ');
  await fireEvent.press(screen.getByTestId('new-folder-submit'));
  expect(mockCreateFolder).toHaveBeenCalledWith('Work');
  expect(mockRefresh).toHaveBeenCalled();
});

test('renames a folder', async () => {
  await render(<FoldersScreen />);
  await fireEvent.press(screen.getByTestId('rename-f1'));
  await fireEvent.changeText(screen.getByTestId('rename-f1-name'), 'Home');
  await fireEvent.press(screen.getByTestId('rename-f1-submit'));
  expect(mockRenameFolder).toHaveBeenCalledWith('f1', 'Home');
});

test('deletes a folder only after confirming', async () => {
  await render(<FoldersScreen />);
  await fireEvent.press(screen.getByTestId('delete-f1'));
  expect(mockRemoveFolder).not.toHaveBeenCalled();
  const [title, body, buttons] = alert.mock.calls[0];
  expect(title).toBe(strings.folders.deleteConfirmTitle('Family'));
  expect(body).toBe(strings.folders.deleteConfirmBody);
  await act(async () => buttons.find((b: { style?: string }) => b.style === 'destructive').onPress());
  expect(mockRemoveFolder).toHaveBeenCalledWith('f1');
});

test('a failed change shows the generic error', async () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  mockCreateFolder.mockRejectedValue(new Error('disk full'));
  await render(<FoldersScreen />);
  await fireEvent.press(screen.getByTestId('new-folder'));
  await fireEvent.changeText(screen.getByTestId('new-folder-name'), 'Work');
  await fireEvent.press(screen.getByTestId('new-folder-submit'));
  expect(alert).toHaveBeenCalledWith(strings.common.error);
  warn.mockRestore();
});

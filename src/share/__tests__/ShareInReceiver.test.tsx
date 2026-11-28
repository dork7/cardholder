import { act, render, screen, waitFor } from '@testing-library/react-native';
import { ShareIntent } from 'expo-share-intent';
import { Alert } from 'react-native';
import { ShareInReceiver } from '../ShareInReceiver';
import { takePendingShared } from '../sharedIn';
import { strings } from '../../strings';
import { AppLockGate } from '../../security/AppLockGate';
import NoteScreen from '../../../app/note/[id]';
import { makeStore } from '../../../test/fixtures';
import { createNoteEditors } from '../../notes/noteEditors';
import { NoteStore } from '../../notes/noteStore';

const mockRouter = { push: jest.fn(), back: jest.fn() };
const sharedImage = (path: string, fileName: string) => ({ path, mimeType: 'image/jpeg', fileName, size: null, width: null, height: null, duration: null });
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({ id: 'new' }),
  Stack: { Screen: () => null },
  usePreventRemove: () => {},
}));
let mockShareIntent: ShareIntent;
let mockError: string | null = null;
const mockReset = jest.fn(() => { mockShareIntent = { files: null, text: null, webUrl: null, type: null }; });
jest.mock('expo-share-intent', () => ({ useShareIntent: () => ({ shareIntent: mockShareIntent, resetShareIntent: mockReset, error: mockError }) }));
const mockCopyShared = jest.fn(async (files: Array<{ path: string; mimeType: string; fileName?: string }>) =>
  files.map((f, i) => ({ ...f, path: `file:///cache/shared/test-${i}.jpg` })));
jest.mock('../sharedFiles', () => ({ clearShared: jest.fn(), copyShared: (...args: unknown[]) => mockCopyShared(...args as [any]), discardShared: jest.fn() }));
let mockServices: { notes: NoteStore; noteEditors: ReturnType<typeof createNoteEditors> };
let mockCards = Array(10).fill({ tags: [] });
jest.mock('../../app/AppProvider', () => ({ useApp: () => ({ services: mockServices, cards: mockCards, unlocked: false }) }));
const mockAuthenticate = jest.fn();
jest.mock('../../security/deviceAuth', () => ({ authenticate: () => mockAuthenticate() }));
jest.mock('react-native-screens', () => ({ FullWindowOverlay: ({ children }: { children: React.ReactNode }) => children }));

beforeEach(async () => {
  jest.clearAllMocks();
  takePendingShared();
  mockError = null;
  mockCards = Array(10).fill({ tags: [] });
  const { notes } = await makeStore();
  mockServices = { notes, noteEditors: createNoteEditors(notes) };
  mockShareIntent = { files: null, text: '  Selected text\nwith a second line العربية  ', webUrl: null, type: 'text' };
});

test.each([1, 2])('%i shared image(s) from content URIs open New document with front and optional back', async (count) => {
  mockCards = [];
  mockShareIntent = {
    files: Array.from({ length: count }, (_, i) => sharedImage(`content://media/images/${i}`, `${i}.jpg`)),
    text: null, webUrl: null, type: 'file',
  };
  await render(<ShareInReceiver />);
  await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith('/edit/new'));
  expect(mockCopyShared).toHaveBeenCalledWith(expect.arrayContaining([
    expect.objectContaining({ path: 'content://media/images/0' }),
  ]));
  expect(takePendingShared()).toEqual({
    kind: 'photos',
    paths: Array.from({ length: count }, (_, i) => `file:///cache/shared/test-${i}.jpg`),
  });
});

test('failed copy shows the share failure alert', async () => {
  mockCards = [];
  mockShareIntent = { files: [sharedImage('content://media/images/0', 'front.jpg')], text: null, webUrl: null, type: 'file' };
  mockCopyShared.mockRejectedValueOnce(new Error('unreadable URI'));
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await render(<ShareInReceiver />);
  await waitFor(() => expect(alert).toHaveBeenCalledWith(strings.shareIn.failed));
  expect(mockRouter.push).not.toHaveBeenCalled();
  alert.mockRestore();
});

test('share library error shows the share failure alert', async () => {
  mockShareIntent = { files: null, text: null, webUrl: null, type: null };
  mockError = 'getShareIntent rejected';
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await render(<ShareInReceiver />);
  expect(alert).toHaveBeenCalledWith(strings.shareIn.failed);
  expect(mockRouter.push).not.toHaveBeenCalled();
  alert.mockRestore();
});

test('shared text waits for unlock, opens a new note at the document limit, and saves unchanged', async () => {
  let unlock!: (result: string) => void;
  mockAuthenticate.mockReturnValue(new Promise((resolve) => { unlock = resolve; }));
  await render(<AppLockGate enabled><ShareInReceiver /></AppLockGate>);
  expect(mockRouter.push).not.toHaveBeenCalled();
  expect(await mockServices.notes.list()).toEqual([]);
  await act(async () => unlock('success'));
  expect(mockRouter.push).toHaveBeenCalledWith('/note/new');
  expect(mockRouter.push).toHaveBeenCalledTimes(1);
  await render(<NoteScreen />);
  expect((await screen.findByTestId('note-body')).props.value).toBe('  Selected text\nwith a second line العربية  ');
  expect(screen.getByTestId('note-title').props.value).toBe('');
  await act(async () => mockServices.noteEditors.flushAll());
  expect(await mockServices.notes.list()).toEqual([expect.objectContaining({ title: '', body: '  Selected text\nwith a second line العربية  ' })]);
  // A later ordinary new note never inherits the previous share.
  await screen.unmount();
  await render(<NoteScreen />);
  expect((await screen.findByTestId('note-body')).props.value).toBe('');
});

test.each(['', '  \n\t  '])('empty shared text creates no note or navigation', async (text) => {
  mockShareIntent = { files: null, text, webUrl: null, type: 'text' };
  await render(<ShareInReceiver />);
  expect(mockReset).toHaveBeenCalledTimes(1);
  expect(mockRouter.push).not.toHaveBeenCalled();
  expect(await mockServices.notes.list()).toEqual([]);
});

test('identical text shared again opens another note, while receiver rerenders do not replay it', async () => {
  const share = mockShareIntent;
  await render(<ShareInReceiver />);
  expect(mockRouter.push).toHaveBeenCalledTimes(1);
  await screen.rerender(<ShareInReceiver />);
  expect(mockRouter.push).toHaveBeenCalledTimes(1);
  // The native hook delivers a fresh intent even when its text is identical.
  mockShareIntent = { ...share };
  await screen.rerender(<ShareInReceiver />);
  expect(mockRouter.push).toHaveBeenCalledTimes(2);
});

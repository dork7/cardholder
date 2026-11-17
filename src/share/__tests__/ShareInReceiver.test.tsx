import { act, render, screen } from '@testing-library/react-native';
import { ShareIntent } from 'expo-share-intent';
import { ShareInReceiver } from '../ShareInReceiver';
import { AppLockGate } from '../../security/AppLockGate';
import NoteScreen from '../../../app/note/[id]';
import { makeStore } from '../../../test/fixtures';
import { createNoteEditors } from '../../notes/noteEditors';
import { NoteStore } from '../../notes/noteStore';

const mockRouter = { push: jest.fn(), back: jest.fn() };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({ id: 'new' }),
  Stack: { Screen: () => null },
  usePreventRemove: () => {},
}));
let mockShareIntent: ShareIntent;
const mockReset = jest.fn(() => { mockShareIntent = { files: null, text: null, webUrl: null, type: null }; });
jest.mock('expo-share-intent', () => ({ useShareIntent: () => ({ shareIntent: mockShareIntent, resetShareIntent: mockReset }) }));
let mockServices: { notes: NoteStore; noteEditors: ReturnType<typeof createNoteEditors> };
jest.mock('../../app/AppProvider', () => ({ useApp: () => ({ services: mockServices, cards: Array(10).fill({}), unlocked: false }) }));
const mockAuthenticate = jest.fn();
jest.mock('../../security/deviceAuth', () => ({ authenticate: () => mockAuthenticate() }));
jest.mock('react-native-screens', () => ({ FullWindowOverlay: ({ children }: { children: React.ReactNode }) => children }));

beforeEach(async () => {
  jest.clearAllMocks();
  const { notes } = await makeStore();
  mockServices = { notes, noteEditors: createNoteEditors(notes) };
  mockShareIntent = { files: null, text: '  Selected text\nwith a second line العربية  ', webUrl: null, type: 'text' };
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

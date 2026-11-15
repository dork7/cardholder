import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert, AppState } from 'react-native';
import { makeStore } from '../../../test/fixtures';
import NotesScreen from '../../../app/notes';
import NoteScreen from '../../../app/note/[id]';
import { createNoteEditors } from '../noteEditors';
import { NoteStore } from '../noteStore';
import { strings } from '../../strings';

let mockId = 'new';
let mockPrevented: ((options: { repeat: () => void }) => void) | undefined;
const mockBack = jest.fn();
const mockRepeat = jest.fn();
const mockRouter = { push: jest.fn(), back: () => {
  mockBack();
  if (mockPrevented) mockPrevented({ repeat: mockRepeat });
} };
jest.mock('expo-router', () => {
  const React = jest.requireActual('react');
  return {
    Stack: { Screen: () => null },
    useRouter: () => mockRouter,
    useLocalSearchParams: () => ({ id: mockId }),
    useFocusEffect: (effect: () => void | (() => void)) => React.useEffect(effect, [effect]),
    usePreventRemove: (prevent: boolean, callback: typeof mockPrevented) => { mockPrevented = prevent ? callback : undefined; },
  };
});
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
let mockServices: { notes: NoteStore; noteEditors: ReturnType<typeof createNoteEditors> };
jest.mock('../../app/AppProvider', () => ({ useApp: () => ({ services: mockServices, cards: Array(10).fill({}), unlocked: false }) }));
const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
const appState = jest.spyOn(AppState, 'addEventListener');

beforeEach(async () => {
  jest.clearAllMocks();
  appState.mockImplementation(() => ({ remove: jest.fn() }));
  mockId = 'new';
  mockPrevented = undefined;
  const { notes } = await makeStore();
  mockServices = { notes, noteEditors: createNoteEditors(notes) };
});

const write = async (title: string, body: string) => {
  await fireEvent.changeText(screen.getByTestId('note-title'), title);
  await fireEvent.changeText(screen.getByTestId('note-body'), body);
};

test('empty Notes has an add action even at the free document limit', async () => {
  await render(<NotesScreen />);
  expect(await screen.findByText(strings.notes.empty)).toBeTruthy();
  await fireEvent.press(screen.getByTestId('add-note'));
  expect(mockRouter.push).toHaveBeenCalledWith('/note/new');
});

test('list shows pinned first, searches bodies and titles, and distinguishes no results', async () => {
  await mockServices.notes.save('a', { title: 'Renewal', body: 'First' });
  await mockServices.notes.save('b', { title: '', body: 'Renewal instructions' });
  await mockServices.notes.setPinned('a', true);
  await render(<NotesScreen />);
  await screen.findByTestId('note-a');
  expect(screen.getAllByRole('button').slice(0, 2).map((button) => button.props.testID)).toEqual(['note-a', 'note-b']);
  await fireEvent.changeText(screen.getByTestId('notes-search'), 'INSTRUCTIONS');
  expect(screen.queryByTestId('note-a')).toBeNull();
  expect(screen.getByText(strings.notes.untitled)).toBeTruthy();
  await fireEvent.changeText(screen.getByTestId('notes-search'), 'missing');
  expect(screen.getByText(strings.notes.noResults)).toBeTruthy();
  await fireEvent.changeText(screen.getByTestId('notes-search'), '');
  await fireEvent.press(screen.getByTestId('note-a'));
  expect(mockRouter.push).toHaveBeenCalledWith('/note/a');
});

test.each([['Title only', ''], ['', 'Body only\nwith another line']])('creates and reopens plain text: %s', async (title, body) => {
  await render(<NoteScreen />);
  await write(title, body);
  await act(async () => fireEvent.press(screen.getByTestId('note-done')));
  expect(mockRepeat).toHaveBeenCalledTimes(1);
  const notes = await mockServices.notes.list();
  expect(notes).toHaveLength(1);
  expect(notes[0]).toMatchObject({ title, body });
  mockId = notes[0].id;
  await screen.unmount();
  await render(<NoteScreen />);
  expect((await screen.findByTestId('note-body')).props.value).toBe(body);
});

test('editing and pinning preserves identity, and backgrounding flushes new text', async () => {
  const note = await mockServices.notes.save('a', { title: 'Before', body: '' });
  mockId = note.id;
  await render(<NoteScreen />);
  await screen.findByTestId('note-body');
  await write('After', 'New body');
  await act(async () => fireEvent.press(screen.getByTestId('note-pin')));
  expect(await mockServices.notes.get('a')).toMatchObject({ title: 'After', pinned: true });
  await fireEvent.changeText(screen.getByTestId('note-body'), 'On background');
  const callback = appState.mock.calls.find(([name]) => name === 'change')![1];
  await act(async () => { callback('background'); await mockServices.noteEditors.flushAll(); });
  expect((await mockServices.notes.get('a'))!.body).toBe('On background');
});

test('blank drafts disappear; existing notes survive clearing and rewriting until exit', async () => {
  await render(<NoteScreen />);
  await act(async () => fireEvent.press(screen.getByTestId('note-done')));
  expect(await mockServices.notes.list()).toEqual([]);
  await screen.unmount();
  await mockServices.notes.save('a', { title: '', body: 'Old' });
  mockId = 'a';
  await render(<NoteScreen />);
  await screen.findByTestId('note-body');
  await write('', '');
  await act(async () => mockServices.noteEditors.flushAll());
  expect(await mockServices.notes.get('a')).not.toBeNull();
  await write('', 'Rewritten');
  await act(async () => fireEvent.press(screen.getByTestId('note-done')));
  expect((await mockServices.notes.get('a'))!.body).toBe('Rewritten');
});

test('cancel deletion keeps the note; confirmed deletion removes it and leaves once', async () => {
  await mockServices.notes.save('a', { title: '', body: 'Mine' });
  mockId = 'a';
  await render(<NoteScreen />);
  await screen.findByTestId('note-delete');
  await fireEvent.press(screen.getByTestId('note-delete'));
  expect(await mockServices.notes.get('a')).not.toBeNull();
  const buttons = alert.mock.calls.at(-1)![2]!;
  expect(buttons[0].style).toBe('cancel');
  await act(async () => buttons[1].onPress!());
  expect(await mockServices.notes.get('a')).toBeNull();
  expect(mockBack).toHaveBeenCalledTimes(1);
});

test('failed save prevents leaving and preserves visible text for retry', async () => {
  const original = mockServices.notes.save;
  mockServices.notes.save = jest.fn(async () => { throw new Error('Disk full'); });
  await render(<NoteScreen />);
  await write('', 'Keep this text');
  await act(async () => fireEvent.press(screen.getByTestId('note-done')));
  expect(mockRepeat).not.toHaveBeenCalled();
  expect(screen.getByText(strings.notes.failed)).toBeTruthy();
  expect(screen.getByTestId('note-body').props.value).toBe('Keep this text');
  mockServices.notes.save = original;
  await act(async () => fireEvent.press(screen.getByTestId('note-done')));
  expect(mockRepeat).toHaveBeenCalledTimes(1);
  expect((await mockServices.notes.list())[0].body).toBe('Keep this text');
});

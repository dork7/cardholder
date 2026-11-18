import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert, AppState, Share } from 'react-native';
import { requestReminderPermissionOnce } from '../../reminders/scheduler';
jest.mock('../../reminders/scheduler', () => ({ requestReminderPermissionOnce: jest.fn(async () => true) }));
jest.mock('@react-native-community/datetimepicker', () => ({
  __esModule: true, default: (props: unknown) => jest.requireActual('react').createElement(jest.requireActual('react-native').View, props),
  DateTimePickerAndroid: { open: jest.fn() },
}));
const mockRefresh = jest.fn(async () => {});
import * as Clipboard from 'expo-clipboard';
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(async () => true) }));
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
jest.mock('../../app/AppProvider', () => ({ useApp: () => ({ services: mockServices, refresh: mockRefresh, cards: Array(10).fill({ id: 'c', name: 'Document', tags: [] }), notes: [], unlocked: false }) }));
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
  await fireEvent.press(screen.getByText(strings.notes.clearSearch));
  expect(screen.getByTestId('notes-search').props.value).toBe('');
  await fireEvent.press(screen.getByTestId('note-a'));
  expect(mockRouter.push).toHaveBeenCalledWith('/note/a');
});

test('note editor adds a tag and Notes filters by that tag', async () => {
  await mockServices.notes.save('a', { title: 'Passport steps', body: 'Call embassy' });
  await mockServices.notes.save('b', { title: 'Groceries', body: 'Milk' });
  mockId = 'a';
  await render(<NoteScreen />);
  await screen.findByTestId('note-body');
  await fireEvent.press(screen.getByTestId('tag-add'));
  await fireEvent.changeText(screen.getByTestId('new-tag-name'), 'Travel');
  await fireEvent.press(screen.getByTestId('new-tag-submit'));
  await waitFor(async () => expect((await mockServices.notes.get('a'))?.tags).toEqual(['Travel']));
  await screen.unmount();
  await render(<NotesScreen />);
  await screen.findByTestId('note-a');
  await fireEvent.press(screen.getByTestId('tag-chip-Travel'));
  expect(screen.getByTestId('note-a')).toBeTruthy();
  expect(screen.queryByTestId('note-b')).toBeNull();
});

test('a ninth note tag explains the limit and keeps the new-tag input open', async () => {
  await mockServices.notes.save('a', { title: 'Passport steps', body: 'Call embassy' });
  await mockServices.notes.setTags('a', Array.from({ length: 8 }, (_, i) => `Tag ${i}`));
  mockId = 'a';
  await render(<NoteScreen />);
  await screen.findByTestId('note-body');
  await fireEvent.press(screen.getByTestId('tag-add'));
  await fireEvent.changeText(screen.getByTestId('new-tag-name'), 'Extra');
  await fireEvent.press(screen.getByTestId('new-tag-submit'));
  expect(alert).toHaveBeenLastCalledWith(strings.tags.tooManyTitle, strings.notes.tooManyTags(8));
  expect(screen.getByTestId('new-tag-name').props.value).toBe('Extra');
  expect((await mockServices.notes.get('a'))?.tags).toHaveLength(8);
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
  expect(mockRefresh).toHaveBeenCalled();
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

test('unpinning from the editor returns the note to its edit-time place', async () => {
  await mockServices.notes.save('old', { title: 'Old', body: '' });
  await mockServices.notes.save('new', { title: 'New', body: '' });
  await mockServices.notes.setPinned('old', true);
  mockId = 'old';
  await render(<NoteScreen />);
  await screen.findByText(strings.notes.unpin);
  await act(async () => fireEvent.press(screen.getByTestId('note-pin')));
  expect(screen.getByText(strings.notes.pin)).toBeTruthy();
  expect((await mockServices.notes.list()).map((n) => [n.id, n.pinned])).toEqual([['new', false], ['old', false]]);
});

test('rapid edits during a slow save show Saving, then leaving keeps only the newest text', async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const save = mockServices.notes.save;
  let first = true;
  mockServices.notes.save = async (id, fields) => {
    if (first) { first = false; await gate; }
    return save(id, fields);
  };
  await render(<NoteScreen />);
  await write('', 'One');
  const callback = appState.mock.calls.find(([name]) => name === 'change')![1];
  await act(async () => { callback('background'); });
  await fireEvent.changeText(screen.getByTestId('note-body'), 'Two');
  await fireEvent.changeText(screen.getByTestId('note-body'), 'Three');
  expect(screen.getByText(strings.notes.saving)).toBeTruthy();
  expect(screen.queryByText(strings.notes.saved)).toBeNull();
  await act(async () => { fireEvent.press(screen.getByTestId('note-done')); release(); });
  expect(mockRepeat).toHaveBeenCalledTimes(1);
  expect((await mockServices.notes.list()).map((n) => n.body)).toEqual(['Three']);
});

test('creating a note at the free document limit never opens the paywall', async () => {
  await render(<NoteScreen />);
  await write('Passport number', '');
  await act(async () => fireEvent.press(screen.getByTestId('note-done')));
  expect(await mockServices.notes.list()).toHaveLength(1);
  expect(mockRouter.push).not.toHaveBeenCalledWith('/paywall');
});

const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction, activityType: undefined });

test('share and copy require confirmation and use the current unsaved text', async () => {
  await render(<NoteScreen />);
  await write('My title', 'Private body');
  expect(share).not.toHaveBeenCalled();
  expect(Clipboard.setStringAsync).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByTestId('note-share'));
  expect(share).not.toHaveBeenCalled();
  await act(async () => alert.mock.calls.at(-1)![2]![1].onPress!());
  expect(share).toHaveBeenCalledWith({ message: 'My title\n\nPrivate body' });
  await fireEvent.press(screen.getByTestId('note-copy'));
  expect(Clipboard.setStringAsync).not.toHaveBeenCalled();
  await act(async () => alert.mock.calls.at(-1)![2]![1].onPress!());
  expect(Clipboard.setStringAsync).toHaveBeenCalledWith('Private body');
  expect(screen.getByText(strings.notes.copied)).toBeTruthy();
});

test('failed sharing keeps the note on screen with an actionable error', async () => {
  share.mockRejectedValueOnce(new Error('Native failure'));
  await render(<NoteScreen />);
  await write('', 'Keep this');
  await fireEvent.press(screen.getByTestId('note-share'));
  await act(async () => alert.mock.calls.at(-1)![2]![1].onPress!());
  expect(screen.getByText(strings.notes.transferFailed)).toBeTruthy();
  expect(screen.getByTestId('note-body').props.value).toBe('Keep this');
});

test('checklist boxes toggle from the list, preserving Markdown and ordinary text', async () => {
  await mockServices.notes.save('a', { title: 'Packing', body: 'Remember\n- [ ] Passport\n- [x] Keys\nLast line' });
  await render(<NotesScreen />);
  const passport = await screen.findByRole('checkbox', { name: 'Passport' });
  expect(passport.props.accessibilityState.checked).toBe(false);
  expect(screen.getByRole('checkbox', { name: 'Keys' }).props.accessibilityState.checked).toBe(true);
  await act(async () => fireEvent.press(passport));
  expect((await mockServices.notes.get('a'))!.body).toBe('Remember\n- [x] Passport\n- [x] Keys\nLast line');
  expect(mockRouter.push).not.toHaveBeenCalled();
  await act(async () => fireEvent.press(screen.getByRole('checkbox', { name: 'Keys' })));
  expect((await mockServices.notes.get('a'))!.body).toBe('Remember\n- [x] Passport\n- [ ] Keys\nLast line');
});

test('typed task markers can be toggled in the note and copied as readable Markdown', async () => {
  await render(<NoteScreen />);
  await write('', 'Before\r\n  - [ ] Passport\r\nAfter');
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Passport' }));
  expect(screen.getByTestId('note-body').props.value).toBe('Before\r\n  - [x] Passport\r\nAfter');
  await act(async () => mockServices.noteEditors.flushAll());
  expect((await mockServices.notes.list())[0].body).toBe('Before\r\n  - [x] Passport\r\nAfter');
  await fireEvent.press(screen.getByTestId('note-copy'));
  await act(async () => alert.mock.calls.at(-1)![2]![1].onPress!());
  expect(Clipboard.setStringAsync).toHaveBeenCalledWith('Before\r\n  - [x] Passport\r\nAfter');
});


test('a chosen date and time schedules, updates and removes a note reminder', async () => {
  await render(<NoteScreen />);
  await write('Private', 'Secret');
  await fireEvent.press(screen.getByText(strings.notes.remind));
  const tomorrow = new Date(Date.now() + 86400000);
  tomorrow.setHours(15, 30, 0, 0);
  await fireEvent(screen.getByLabelText(strings.notes.reminderDate), 'onChange', { type: 'set' }, tomorrow);
  await fireEvent(screen.getByLabelText(strings.notes.reminderTime), 'onChange', { type: 'set' }, tomorrow);
  await act(async () => fireEvent.press(screen.getByText(strings.notes.reminderSave)));
  expect(requestReminderPermissionOnce).toHaveBeenCalledTimes(1);
  expect((await mockServices.notes.list())[0]).toMatchObject({ reminderAt: tomorrow.getTime() });
  expect(mockRefresh).toHaveBeenCalled();
  await act(async () => fireEvent.press(screen.getByText(strings.notes.reminderRemove)));
  expect((await mockServices.notes.list())[0].reminderAt).toBeUndefined();
});

test('denied notifications show help without silently saving a reminder', async () => {
  jest.mocked(requestReminderPermissionOnce).mockResolvedValueOnce(false);
  await render(<NoteScreen />);
  await write('', 'Secret');
  await fireEvent.press(screen.getByText(strings.notes.remind));
  await act(async () => fireEvent.press(screen.getByText(strings.notes.reminderSave)));
  expect(screen.getByText(strings.notes.reminderDenied)).toBeTruthy();
  expect((await mockServices.notes.list())[0]?.reminderAt).toBeUndefined();
});

test('past reminder dates are rejected before permission is requested', async () => {
  await render(<NoteScreen />);
  await write('', 'Secret');
  await fireEvent.press(screen.getByText(strings.notes.remind));
  await fireEvent(screen.getByLabelText(strings.notes.reminderDate), 'onChange', { type: 'set' }, new Date(2020, 0, 1));
  await act(async () => fireEvent.press(screen.getByText(strings.notes.reminderSave)));
  expect(screen.getByText(strings.notes.reminderInvalid)).toBeTruthy();
  expect(requestReminderPermissionOnce).not.toHaveBeenCalled();
});

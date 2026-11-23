import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { Linking } from 'react-native';
import NoteDetail from '../../../app/note-view/[id]';
import { linkParts } from '../NoteBody';
import { Note } from '../noteStore';
import { strings } from '../../strings';

let mockNotes: Note[] = [];
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'n' }),
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('../../app/AppProvider', () => ({
  useApp: () => ({ cards: [], notes: mockNotes, services: { notes: {} }, refresh: jest.fn() }),
}));

const note = (overrides: Partial<Note> = {}): Note => ({
  id: 'n', title: 'Trip', body: 'See https://example.com/booking.', tags: [], documentId: null, pinned: false,
  createdAt: 1, updatedAt: 1, ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockNotes = [note()];
});

test('web addresses become links; sentence punctuation stays outside them', () => {
  expect(linkParts('See https://example.com/booking. Then www.example.org!')).toEqual([
    { text: 'See ' },
    { text: 'https://example.com/booking', url: 'https://example.com/booking' },
    { text: '. Then ' },
    { text: 'www.example.org', url: 'https://www.example.org' },
    { text: '!' },
  ]);
  expect(linkParts('No links here')).toEqual([{ text: 'No links here' }]);
  expect(linkParts('')).toEqual([{ text: '' }]);
});

test('a link in the note opens in the browser when tapped', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  await render(<NoteDetail />);
  await fireEvent.press(screen.getByRole('link', { name: 'https://example.com/booking' }));
  expect(open).toHaveBeenCalledWith('https://example.com/booking');
});

test('a future reminder is shown; a past one is not', async () => {
  const at = Date.now() + 86_400_000;
  mockNotes = [note({ reminderAt: at })];
  await render(<NoteDetail />);
  expect(screen.getByText(strings.notes.reminderScheduled(new Date(at).toLocaleString()))).toBeTruthy();

  await screen.unmount();
  mockNotes = [note({ reminderAt: Date.now() - 1000 })];
  await render(<NoteDetail />);
  expect(screen.queryByText(/^Reminder:/)).toBeNull();
});

test('Delete is kept apart from Edit, which stays in the footer', async () => {
  await render(<NoteDetail />);
  const footer = within(screen.getByTestId('note-actions'));
  expect(footer.getByRole('button', { name: strings.notes.editTitle })).toBeTruthy();
  expect(footer.queryByRole('button', { name: strings.notes.remove })).toBeNull();
  expect(screen.getByRole('button', { name: strings.notes.remove })).toBeTruthy();
});

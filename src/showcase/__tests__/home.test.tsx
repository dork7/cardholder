import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { Dimensions, StyleSheet } from 'react-native';
import Home from '../../../app/index';
import { makeCard } from '../../../test/fixtures';
import { createUndo } from '../../app/undo';
import { Card } from '../../cards/types';
import { Note } from '../../notes/noteStore';
import { strings } from '../../strings';
import { DocumentVisit } from '../documentVisits';

let mockCards: Card[];
let mockNotes: Note[];
let mockVisits: DocumentVisit[];
let mockOpenImport = false;
const mockClearOpenImport = jest.fn(() => { mockOpenImport = false; });
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockSetPinned = jest.fn(() => Promise.resolve());
const mockRefresh = jest.fn(() => Promise.resolve());
const mockUndo = createUndo();
const mockServices = {
  db: { getAllAsync: () => Promise.resolve(mockVisits) },
  store: { setPinned: mockSetPinned },
};

jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    useRouter: () => ({ push: mockPush, replace: mockReplace }),
    useFocusEffect: (effect: () => void | (() => void)) => useEffect(effect, [effect]),
  };
});
jest.mock('../../app/AppProvider', () => ({
  useApp: () => ({ cards: mockCards, notes: mockNotes, services: mockServices, refresh: mockRefresh, undo: mockUndo,
    openImportOnReady: mockOpenImport, clearOpenImport: mockClearOpenImport }),
}));
jest.mock('../../hooks/useCardImage', () => ({ useCardImage: () => 'data:image/jpeg;base64,AA==' }));

beforeEach(() => {
  jest.clearAllMocks();
  mockCards = [];
  mockNotes = [];
  mockVisits = [];
  mockOpenImport = false;
});
afterEach(() => jest.restoreAllMocks());

test('favorites use pinned thumbnails and track the selected page across a wide viewport', async () => {
  const window = Dimensions.get('window');
  jest.spyOn(Dimensions, 'get').mockReturnValue({ ...window, width: 1000 });
  mockCards = [
    makeCard({ id: 'passport', name: 'Passport', pinned: true, blurPreview: true }),
    makeCard({ id: 'insurance', name: 'Insurance', pinned: true }),
    makeCard({ id: 'gym', name: 'Gym' }),
  ];
  await render(<Home />);

  const favorites = within(screen.getByTestId('showcase-favorites'));
  expect(favorites.queryByRole('button', { name: 'Gym' })).toBeNull();
  const passport = favorites.getByRole('button', { name: 'Passport' });
  expect(within(passport).getByTestId('card-picture').props.blurRadius).toBeGreaterThan(0);
  await fireEvent.press(passport);
  expect(mockPush).toHaveBeenCalledWith('/card/passport');

  const carousel = favorites.getByTestId('favorites-carousel');
  const interval = carousel.props.snapToInterval;
  const cardWidth = StyleSheet.flatten(passport.props.style).width;
  const { paddingStart, paddingEnd } = StyleSheet.flatten(carousel.props.contentContainerStyle);
  // The final card has a full snap interval and the same left inset on a tablet.
  expect(paddingStart + cardWidth + paddingEnd).toBe(568);
  await fireEvent.scroll(carousel, { nativeEvent: { contentOffset: { x: interval, y: 0 } } });
  expect(favorites.getByRole('button', { name: 'Show favorite 2' }).props.accessibilityState.selected).toBe(true);
  await fireEvent.press(favorites.getByRole('button', { name: 'Show favorite 1' }));
  expect(favorites.getByRole('button', { name: 'Show favorite 1' }).props.accessibilityState.selected).toBe(true);
});

test('Home shows the three latest available visits and two latest notes with activity', async () => {
  const now = Date.now();
  mockCards = [
    makeCard({ id: 'a', name: 'Alpha', pinned: true }),
    makeCard({ id: 'b', name: 'Bravo' }),
    makeCard({ id: 'c', name: 'Charlie', pinned: true }),
    makeCard({ id: 'd', name: 'Delta' }),
  ];
  mockVisits = ['missing', 'b', 'd', 'c', 'a'].map((id, index) => ({ id, visitedAt: now - index * 120_000 }));
  mockNotes = ['Old note', 'New note', 'Second note'].map((title, index) => ({
    id: String(index), title, body: 'Private content', tags: [], documentId: null, pinned: false, createdAt: now - 300_000,
    updatedAt: now - [240_000, 10_000, 60_000][index],
  }));
  await render(<Home />);

  expect(screen.getAllByText(/^Opened /).map((row) => row.props.children)).toEqual([
    'Opened 2 minutes ago', 'Opened 4 minutes ago', 'Opened 6 minutes ago',
  ]);
  const pin = screen.getAllByRole('button', { name: strings.card.pin })[0];
  await fireEvent.press(pin);
  expect(mockSetPinned).toHaveBeenCalledWith('b', true);
  expect(mockRefresh).toHaveBeenCalled();
  expect(mockPush).not.toHaveBeenCalled();

  expect(screen.getByText('Changed just now')).toBeTruthy();
  expect(screen.getByText('Changed 1 minute ago')).toBeTruthy();
  expect(screen.queryByText('Old note')).toBeNull();
  expect(screen.queryByText('Private content')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'New note' }));
  expect(mockPush).toHaveBeenLastCalledWith('/note-view/1');
});

test('the empty dashboard offers real library, search, space and creation routes', async () => {
  await render(<Home />);
  expect(screen.getByText('Pin a document to keep it here.')).toBeTruthy();
  expect(screen.getByText('Open a document to see it here.')).toBeTruthy();
  expect(screen.getByText('Write a note to keep it close.')).toBeTruthy();
  expect(screen.getByText('Choose a space to add documents and notes.')).toBeTruthy();

  await fireEvent.press(screen.getByRole('button', { name: 'View pinned documents' }));
  expect(mockReplace).toHaveBeenLastCalledWith('/documents?mode=favorites');
  await fireEvent.press(screen.getByRole('button', { name: 'View recently visited' }));
  expect(mockReplace).toHaveBeenLastCalledWith('/documents?mode=recent');
  await fireEvent.press(screen.getByRole('button', { name: 'View notes' }));
  expect(mockReplace).toHaveBeenLastCalledWith('/notes');
  await fireEvent.press(screen.getByRole('button', { name: 'View spaces' }));
  expect(mockReplace).toHaveBeenLastCalledWith('/spaces');
  await fireEvent.press(screen.getByTestId('browse-space-travel'));
  expect(mockReplace).toHaveBeenLastCalledWith('/spaces?space=travel');
  await fireEvent.press(screen.getByRole('button', { name: 'Search documents' }));
  expect(mockReplace).toHaveBeenLastCalledWith('/documents?search=1');

  await fireEvent.press(screen.getByTestId('showcase-add-button'));
  await fireEvent.press(screen.getByTestId('showcase-add-document'));
  expect(mockPush).toHaveBeenLastCalledWith('/edit/new');
  await fireEvent.press(screen.getByTestId('showcase-add-button'));
  await fireEvent.press(screen.getByTestId('showcase-add-note'));
  expect(mockPush).toHaveBeenLastCalledWith('/note/new');
});

test('a pending backup recovery opens Import once Home is ready', async () => {
  mockOpenImport = true;
  await render(<Home />);
  expect(mockClearOpenImport).toHaveBeenCalledTimes(1);
  expect(mockPush).toHaveBeenCalledWith('/import');
});

test('space cards tell a screen reader their name and live counts', async () => {
  mockCards = [makeCard({ id: 'a', spaceId: 'travel' }), makeCard({ id: 'b', spaceId: 'travel' })];
  mockNotes = [{ id: 'n', title: '', body: '', tags: [], documentId: null, pinned: false, createdAt: 1, updatedAt: 1, spaceId: 'travel' }];
  await render(<Home />);
  expect(screen.getByTestId('browse-space-travel').props.accessibilityLabel).toBe('Travel space, 2 documents, 1 note');
  expect(screen.getByTestId('browse-space-home').props.accessibilityLabel).toBe('Home space, 0 documents, 0 notes');
});

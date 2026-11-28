import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { makeCard } from '../../../test/fixtures';
import TagsScreen from '../../../app/tags';
import { strings } from '../../strings';
import { Card, CardFields } from '../types';

const mockUpdate = jest.fn();
const mockRefresh = jest.fn();
let mockCards: Card[] = [];
let mockNotes: { id: string; tags: string[] }[] = [];
const mockSetTags = jest.fn();

jest.mock('../../app/AppProvider', () => ({
  useApp: () => ({
    services: { store: { update: (id: string, fields: CardFields) => mockUpdate(id, fields), removeTagFromRecentlyDeleted: async () => 0 }, notes: { setTags: (id: string, tags: string[]) => mockSetTags(id, tags) } },
    cards: mockCards,
    notes: mockNotes,
    refresh: () => mockRefresh(),
  }),
}));

let alert: jest.SpyInstance;
beforeEach(() => {
  jest.clearAllMocks();
  mockCards = [
    makeCard({ id: 'c1', name: 'Mulkiya', tags: ['Vehicle', 'Family'] }),
    makeCard({ id: 'c2', name: 'Rental contract', tags: ['vehicle'] }),
    makeCard({ id: 'c3', name: 'Gym', tags: ['Membership'] }),
  ];
  mockUpdate.mockResolvedValue(undefined);
  mockSetTags.mockResolvedValue(undefined);
  mockNotes = [];
  mockRefresh.mockResolvedValue(undefined);
  alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => alert.mockRestore());

const pressInAlert = async (label: string) => {
  const buttons = alert.mock.calls[0][2] as { text: string; onPress?: () => unknown }[];
  await buttons.find((b) => b.text === label)?.onPress?.();
};

test('lists every tag in use with how many cards have it', async () => {
  await render(<TagsScreen />);
  expect(screen.getByText('Vehicle')).toBeTruthy();
  expect(screen.getByText('Family')).toBeTruthy();
  expect(screen.getByText('Membership')).toBeTruthy();
  expect(screen.getAllByText(strings.tagsScreen.count(2, 0))).toHaveLength(1);
  expect(screen.queryByTestId('no-tags')).toBeNull();
});

test('a note-only tag is listed and removed from notes', async () => {
  mockNotes = [{ id: 'n', tags: ['Travel', 'ID'] }];
  await render(<TagsScreen />);
  expect(screen.getAllByText(strings.tagsScreen.count(0, 1))).toHaveLength(2);
  await fireEvent.press(screen.getByTestId('delete-tag-Travel'));
  const actions = alert.mock.calls.at(-1)?.[2] as { onPress?: () => void }[];
  await actions[1].onPress?.();
  await waitFor(() => expect(mockSetTags).toHaveBeenCalledWith('n', ['ID']));
});

test('with no tags it says so', async () => {
  mockCards = [makeCard({ id: 'c1', tags: [] })];
  await render(<TagsScreen />);
  expect(screen.getByTestId('no-tags')).toBeTruthy();
});

test('deleting a tag asks first, then takes it off every card that has it and keeps their other tags', async () => {
  await render(<TagsScreen />);
  await fireEvent.press(screen.getByTestId('delete-tag-Vehicle'));
  expect(alert).toHaveBeenCalledWith(
    strings.tagsScreen.deleteConfirmTitle('Vehicle'),
    strings.tagsScreen.deleteConfirmBody(2),
    expect.any(Array),
  );
  expect(mockUpdate).not.toHaveBeenCalled();
  await pressInAlert(strings.common.delete);
  await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
  expect(mockUpdate).toHaveBeenCalledTimes(2);
  expect(mockUpdate).toHaveBeenCalledWith('c1', expect.objectContaining({ name: 'Mulkiya', tags: ['Family'] }));
  expect(mockUpdate).toHaveBeenCalledWith('c2', expect.objectContaining({ name: 'Rental contract', tags: [] }));
});

test('cancelling leaves the tag alone', async () => {
  await render(<TagsScreen />);
  await fireEvent.press(screen.getByTestId('delete-tag-Vehicle'));
  await pressInAlert(strings.common.cancel);
  expect(mockUpdate).not.toHaveBeenCalled();
});

test('says how many cards could not be changed', async () => {
  mockUpdate.mockRejectedValueOnce(new Error('disk full'));
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  await render(<TagsScreen />);
  await fireEvent.press(screen.getByTestId('delete-tag-Vehicle'));
  await pressInAlert(strings.common.delete);
  await waitFor(() => expect(alert).toHaveBeenLastCalledWith(strings.tagsScreen.removeFailed(1).title, strings.tagsScreen.removeFailed(1).body));
  warn.mockRestore();
});

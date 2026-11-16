import { fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { makeCard } from '../../../test/fixtures';
import RecentlyDeletedScreen from '../../../app/recently-deleted';
import SettingsScreen from '../../../app/settings';
import { FREE_CARD_LIMIT } from '../../config';
import { strings } from '../../strings';
import { Card, DeletedCard } from '../types';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 10, 15, 12);

const mockRouter = { push: jest.fn(), back: jest.fn() };
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    useRouter: () => mockRouter,
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});

let mockDeleted: DeletedCard[] = [];
let mockCards: Card[] = [];
let mockUnlocked = false;
const mockRestore = jest.fn(async (id: string) => {
  mockDeleted = mockDeleted.filter((c) => c.id !== id);
});
const mockErase = jest.fn(async (id: string) => {
  mockDeleted = mockDeleted.filter((c) => c.id !== id);
});
const mockEraseAll = jest.fn(async () => {
  mockDeleted = [];
});
const mockRefresh = jest.fn(async () => {});
const mockServices = {
  settings: { getNumber: async () => null },
  store: {
    listRecentlyDeleted: async () => mockDeleted,
    restore: (id: string) => mockRestore(id),
    erase: (id: string) => mockErase(id),
    eraseRecentlyDeleted: () => mockEraseAll(),
    loadImage: async () => null,
  },
};
jest.mock('../../app/AppProvider', () => ({
  useApp: () => ({
    services: mockServices,
    cards: mockCards,
    unlocked: mockUnlocked,
    refresh: mockRefresh,
    appLock: false,
    setAppLock: jest.fn(),
    homeFolders: { filter: true, manage: true },
    setHomeFolders: jest.fn(),
    cardBrightness: true,
    setCardBrightness: jest.fn(),
    stackVertical: false,
    setStackVertical: jest.fn(),
  }),
}));

const deleted = (id: string, name: string, deletedAt: number): DeletedCard => ({ ...makeCard({ id, name }), deletedAt });

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
  mockDeleted = [deleted('a', 'Passport', NOW - 2 * DAY), deleted('b', 'Gym', NOW - 29.5 * DAY)];
  mockCards = [];
  mockUnlocked = false;
});
afterEach(() => jest.restoreAllMocks());

test('Settings shows how many documents are in Recently deleted and opens it', async () => {
  await render(<SettingsScreen />);
  const entry = await screen.findByText(strings.recentlyDeleted.entry(2));
  await fireEvent.press(entry);
  expect(mockRouter.push).toHaveBeenCalledWith('/recently-deleted');
});

test('each deleted document shows its name and the days it has left', async () => {
  await render(<RecentlyDeletedScreen />);
  expect(await screen.findByText('Passport')).toBeTruthy();
  expect(screen.getByText(strings.recentlyDeleted.daysLeft(28))).toBeTruthy();
  expect(screen.getByText('Gym')).toBeTruthy();
  expect(screen.getByText(strings.recentlyDeleted.daysLeft(1))).toBeTruthy();
});

test('Restore brings the document back to home and takes it off the list', async () => {
  await render(<RecentlyDeletedScreen />);
  await fireEvent.press(await screen.findByTestId('restore-a'));
  expect(mockRestore).toHaveBeenCalledWith('a');
  expect(mockRefresh).toHaveBeenCalled();
  expect(screen.queryByText('Passport')).toBeNull();
  expect(screen.getByText('Gym')).toBeTruthy();
});

test('Restore at the free limit opens the upgrade screen and keeps the document here', async () => {
  mockCards = Array.from({ length: FREE_CARD_LIMIT }, (_, i) => makeCard({ id: `c${i}` }));
  await render(<RecentlyDeletedScreen />);
  await fireEvent.press(await screen.findByTestId('restore-a'));
  expect(mockRouter.push).toHaveBeenCalledWith('/paywall');
  expect(mockRestore).not.toHaveBeenCalled();
  expect(screen.getByText('Passport')).toBeTruthy();
});

test('an unlocked user restores past the free limit', async () => {
  mockCards = Array.from({ length: FREE_CARD_LIMIT }, (_, i) => makeCard({ id: `c${i}` }));
  mockUnlocked = true;
  await render(<RecentlyDeletedScreen />);
  await fireEvent.press(await screen.findByTestId('restore-a'));
  expect(mockRestore).toHaveBeenCalledWith('a');
});

test('says so when nothing has been deleted', async () => {
  mockDeleted = [];
  await render(<RecentlyDeletedScreen />);
  expect(await screen.findByText(strings.recentlyDeleted.empty)).toBeTruthy();
});

describe('erasing for good', () => {
  let alert: jest.SpyInstance;
  beforeEach(() => {
    alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  // Alert.alert(title, body, buttons): press the button with this label.
  const pressInAlert = async (label: string) => {
    const buttons = alert.mock.calls[0][2] as { text: string; onPress?: () => unknown }[];
    await buttons.find((b) => b.text === label)?.onPress?.();
  };

  test('Delete now asks first, then erases that document only', async () => {
    await render(<RecentlyDeletedScreen />);
    await fireEvent.press(await screen.findByTestId('delete-now-a'));
    expect(alert).toHaveBeenCalledWith(strings.recentlyDeleted.deleteNowTitle('Passport'), strings.recentlyDeleted.deleteNowBody, expect.any(Array));
    expect(mockErase).not.toHaveBeenCalled();
    await pressInAlert(strings.recentlyDeleted.deleteNow);
    expect(mockErase).toHaveBeenCalledWith('a');
    expect(mockEraseAll).not.toHaveBeenCalled();
    expect(await screen.findByText('Gym')).toBeTruthy();
    expect(screen.queryByText('Passport')).toBeNull();
  });

  test('Empty asks first, then erases every deleted document', async () => {
    await render(<RecentlyDeletedScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: strings.recentlyDeleted.emptyLabel }));
    expect(alert).toHaveBeenCalledWith(strings.recentlyDeleted.emptyTitle, strings.recentlyDeleted.emptyBody(2), expect.any(Array));
    expect(mockEraseAll).not.toHaveBeenCalled();
    await pressInAlert(strings.recentlyDeleted.emptyAction);
    expect(mockEraseAll).toHaveBeenCalled();
    expect(await screen.findByText(strings.recentlyDeleted.empty)).toBeTruthy();
    expect(screen.queryByRole('button', { name: strings.recentlyDeleted.emptyLabel })).toBeNull();
  });

  test.each([
    ['Delete now', () => screen.findByTestId('delete-now-a')],
    ['Empty', () => screen.findByRole('button', { name: strings.recentlyDeleted.emptyLabel })],
  ])('cancelling %s leaves everything as it was', async (_, find) => {
    await render(<RecentlyDeletedScreen />);
    await fireEvent.press(await find());
    await pressInAlert(strings.common.cancel);
    expect(mockErase).not.toHaveBeenCalled();
    expect(mockEraseAll).not.toHaveBeenCalled();
    expect(screen.getByText('Passport')).toBeTruthy();
    expect(screen.getByText('Gym')).toBeTruthy();
  });
});

test('screen readers hear each row as its name and days left, and its buttons by name', async () => {
  await render(<RecentlyDeletedScreen />);
  expect(await screen.findByLabelText(`Passport, ${strings.recentlyDeleted.daysLeft(28)}`)).toBeTruthy();
  expect(screen.getByRole('button', { name: strings.recentlyDeleted.restoreLabel('Passport') })).toBeTruthy();
  expect(screen.getByRole('button', { name: strings.recentlyDeleted.deleteNowLabel('Passport') })).toBeTruthy();
  expect(screen.getByRole('button', { name: strings.recentlyDeleted.emptyLabel })).toBeTruthy();
});

test('the empty state explains the 30 days and offers no Empty button', async () => {
  mockDeleted = [];
  await render(<RecentlyDeletedScreen />);
  expect(await screen.findByText(strings.recentlyDeleted.empty)).toBeTruthy();
  expect(strings.recentlyDeleted.empty).toContain('30 days');
  expect(screen.queryByRole('button', { name: strings.recentlyDeleted.emptyLabel })).toBeNull();
});


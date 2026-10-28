import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { makeCard } from '../../../test/fixtures';
import { Folder } from '../types';
import Home from '../../../app/index';
import { FREE_CARD_LIMIT } from '../../config';
import { strings } from '../../strings';

let mockCards = [
  makeCard({ id: 'a', name: 'Emirates ID', category: 'id' }),
  makeCard({ id: 'b', name: 'Health insurance', category: 'insurance' }),
  makeCard({ id: 'c', name: 'Gym', category: 'membership' }),
];

const mockPush = jest.fn();
// Folders are hidden in the app for now (FOLDERS_ENABLED); these tests cover both ways.
let mockFoldersEnabled = true;
jest.mock('../../config', () =>
  Object.defineProperty({ ...jest.requireActual('../../config') }, 'FOLDERS_ENABLED', {
    get: () => mockFoldersEnabled,
  }),
);
jest.mock('expo-notifications', () => ({ useLastNotificationResponse: () => null }));
jest.mock('expo-quick-actions/hooks', () => ({ useQuickActionCallback: () => {} }));
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    useRouter: () => ({ push: mockPush }),
    // Home counts as focused for as long as it is mounted.
    useFocusEffect: (effect: () => void | (() => void)) => useEffect(effect, [effect]),
  };
});
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('react-native-gesture-handler', () => ({
  GestureDetector: ({ children }: { children: React.ReactNode }) => children,
  usePanGesture: () => ({}),
  useTapGesture: () => ({}),
  useCompetingGestures: () => ({}),
}));
const mockSetAppearance = jest.fn(() => Promise.resolve());
let mockUnlocked = false;
let mockFolders: Folder[] = [];
let mockHomeFolders = { filter: true, manage: true };
let mockLastExportAt: string | null = null;
const mockSettingsSet = jest.fn(() => Promise.resolve());
// Stable across renders, as the real provider's services are.
const mockServices = {
  store: {
    loadImage: () => Promise.resolve(null),
    count: () => Promise.resolve(mockCards.length),
    lastChangeAt: () => Promise.resolve(1_000),
  },
  settings: {
    getNumber: (key: string) => Promise.resolve(key === 'lastExportAt' && mockLastExportAt ? Number(mockLastExportAt) : null),
    set: mockSettingsSet,
  },
};
jest.mock('../../app/AppProvider', () => ({
  useApp: () => ({
    cards: mockCards,
    folders: mockFolders,
    // As the provider builds it: the saved list plus any category a card holds.
    categories: require('../categories').categoryOptions(['id', 'insurance', 'membership', 'other'], mockCards),
    unlocked: mockUnlocked,
    services: mockServices,
    openImportOnReady: false,
    clearOpenImport: () => {},
    appearance: 'system',
    setAppearance: mockSetAppearance,
    homeFolders: mockHomeFolders,
  }),
}));

beforeEach(() => {
  mockPush.mockClear();
  mockSettingsSet.mockClear();
  mockUnlocked = false;
  mockFolders = [];
  mockHomeFolders = { filter: true, manage: true };
  mockFoldersEnabled = true;
  mockLastExportAt = String(Date.now());
});

async function withCards(cards: typeof mockCards, run: () => Promise<void>) {
  const all = mockCards;
  mockCards = cards;
  try {
    await run();
  } finally {
    mockCards = all;
  }
}

async function layoutStack() {
  await act(async () => {
    fireEvent(screen.getByTestId('card-stack-frame'), 'layout', {
      nativeEvent: { layout: { width: 340, height: 0, x: 0, y: 0 } },
    });
  });
}

async function renderHome() {
  await render(<Home />);
  if (mockCards.length > 0) await layoutStack();
}

test('the stack shows every card until a type is chosen', async () => {
  await renderHome();
  expect(screen.getByTestId('card-stack').props.accessibilityValue).toEqual({ text: strings.home.cardOf(1, 3) });
});

test('choosing a type narrows the stack to cards of that type', async () => {
  await renderHome();
  await act(async () => fireEvent.press(screen.getByRole('radio', { name: strings.categories.insurance })));
  await act(async () => {
    fireEvent(screen.getByTestId('card-stack-frame'), 'layout', {
      nativeEvent: { layout: { width: 340, height: 0, x: 0, y: 0 } },
    });
  });
  const stack = screen.getByTestId('card-stack');
  expect(stack.props.accessibilityLabel).toBe('Health insurance');
  expect(stack.props.accessibilityValue).toEqual({ text: strings.home.cardOf(1, 1) });
});

test('with no folders there is no folder filter', async () => {
  await renderHome();
  expect(screen.queryByTestId('folder-filter-all')).toBeNull();
});

test('choosing a folder narrows the stack to its cards', async () => {
  mockFolders = [{ id: 'f1', name: 'Health', createdAt: 1 }];
  mockCards = mockCards.map((c) => (c.id === 'b' ? { ...c, folderId: 'f1' } : c));
  await renderHome();
  await act(async () => fireEvent.press(screen.getByTestId('folder-filter-f1')));
  await act(async () => {
    fireEvent(screen.getByTestId('card-stack-frame'), 'layout', {
      nativeEvent: { layout: { width: 340, height: 0, x: 0, y: 0 } },
    });
  });
  const stack = screen.getByTestId('card-stack');
  expect(stack.props.accessibilityLabel).toBe('Health insurance');
  expect(stack.props.accessibilityValue).toEqual({ text: strings.home.cardOf(1, 1) });
  await act(async () => fireEvent.press(screen.getByRole('button', { name: strings.folders.manage })));
  expect(mockPush).toHaveBeenCalledWith('/folders');
});

test('with folders hidden there is no folder row', async () => {
  mockFoldersEnabled = false;
  mockFolders = [{ id: 'f1', name: 'Health', createdAt: 1 }];
  await renderHome();
  expect(screen.queryByTestId('folder-filter-f1')).toBeNull();
  expect(screen.queryByRole('button', { name: strings.folders.manage })).toBeNull();
});

test('settings can hide the folder filter and the manage shortcut separately', async () => {
  mockFolders = [{ id: 'f1', name: 'Health', createdAt: 1 }];
  mockHomeFolders = { filter: false, manage: true };
  await renderHome();
  expect(screen.queryByTestId('folder-filter-f1')).toBeNull();
  expect(screen.getByRole('button', { name: strings.folders.manage })).toBeTruthy();

  mockHomeFolders = { filter: true, manage: false };
  await renderHome();
  expect(screen.getByTestId('folder-filter-f1')).toBeTruthy();
  expect(screen.queryByRole('button', { name: strings.folders.manage })).toBeNull();
});

test('types with no cards are not offered', async () => {
  await renderHome();
  expect(screen.getByRole('radio', { name: strings.categories.id })).toBeTruthy();
  expect(screen.queryByRole('radio', { name: strings.categories.other })).toBeNull();
});

test('with only one type there is nothing to filter, so no filter is shown', async () => {
  const all = mockCards;
  mockCards = [makeCard({ id: 'a', name: 'Emirates ID', category: 'id' }), makeCard({ id: 'b', name: 'Visa', category: 'id' })];
  try {
    await renderHome();
    expect(screen.queryByRole('radio')).toBeNull();
  } finally {
    mockCards = all;
  }
});

test('the appearance toggle says what is on and moves to the next choice', async () => {
  await renderHome();
  const toggle = screen.getByRole('button', { name: strings.home.appearance });
  expect(toggle.props.accessibilityValue).toEqual({ text: strings.home.appearances.system });
  await fireEvent.press(toggle);
  expect(mockSetAppearance).toHaveBeenCalledWith('light');
});

test('search narrows the stack by name, and says so when nothing matches', async () => {
  await renderHome();
  await act(async () => fireEvent.changeText(screen.getByTestId('search'), 'gym'));
  await layoutStack();
  expect(screen.getByTestId('card-stack').props.accessibilityLabel).toBe('Gym');
  await act(async () => fireEvent.changeText(screen.getByTestId('search'), 'passport'));
  expect(screen.queryByTestId('card-stack')).toBeNull();
  expect(screen.getByText(strings.home.noResults)).toBeTruthy();
  await act(async () => fireEvent.press(screen.getByRole('button', { name: strings.home.clearSearch })));
  await layoutStack();
  expect(screen.getByTestId('card-stack').props.accessibilityValue).toEqual({ text: strings.home.cardOf(1, 3) });
});

test('adding goes to the editor', async () => {
  await renderHome();
  await fireEvent.press(screen.getByTestId('add-card'));
  expect(mockPush).toHaveBeenLastCalledWith('/edit/new');
});

const fullWallet = () => Array.from({ length: FREE_CARD_LIMIT }, (_, i) => makeCard({ id: `c${i}`, name: `Card ${i}` }));

// CARD_LIMIT_ENABLED is off while there is no paywall.
test('with the card limit off, adding past it still goes to the editor', async () => {
  await withCards(fullWallet(), async () => {
    await renderHome();
    await fireEvent.press(screen.getByTestId('add-card'));
    expect(mockPush).toHaveBeenLastCalledWith('/edit/new');
  });
});

test('the backup banner shows until the user backs up or dismisses it', async () => {
  mockLastExportAt = null;
  await renderHome();
  expect(await screen.findByTestId('backup-banner')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: strings.backupBanner.action }));
  expect(mockPush).toHaveBeenLastCalledWith('/export');
  await act(async () => fireEvent.press(screen.getByRole('button', { name: strings.backupBanner.dismiss })));
  expect(screen.queryByTestId('backup-banner')).toBeNull();
  expect(mockSettingsSet).toHaveBeenCalledWith('backupSnoozedUntil', expect.any(String));
});

test('no banner right after a backup', async () => {
  await renderHome();
  await act(async () => {});
  expect(screen.queryByTestId('backup-banner')).toBeNull();
});

test('settings opens from the header', async () => {
  await renderHome();
  await fireEvent.press(screen.getByRole('button', { name: strings.home.settings }));
  expect(mockPush).toHaveBeenLastCalledWith('/settings');
});

test('with no cards, home shows the empty state without search or filters', async () => {
  await withCards([], async () => {
    await renderHome();
    expect(screen.getByTestId('empty-state')).toBeTruthy();
    expect(screen.getByText(strings.home.emptyTitle)).toBeTruthy();
    expect(screen.queryByTestId('search')).toBeNull();
    expect(screen.queryByRole('radio')).toBeNull();
  });
});

test('pinned cards appear on the home page, stay put while searching, and open on tap', async () => {
  await withCards(
    [
      makeCard({ id: 'a', name: 'Emirates ID', category: 'id', pinned: true }),
      makeCard({ id: 'b', name: 'Gym', category: 'membership' }),
    ],
    async () => {
      await renderHome();
      expect(screen.getByTestId('pinned-a')).toBeTruthy();
      expect(screen.queryByTestId('pinned-b')).toBeNull();
      await fireEvent.changeText(screen.getByTestId('search'), 'gym');
      expect(screen.getByTestId('pinned-a')).toBeTruthy();
      await fireEvent.press(screen.getByTestId('pinned-a'));
      expect(mockPush).toHaveBeenCalledWith('/card/a');
    },
  );
});

test('nothing pinned, no pinned section', async () => {
  await renderHome();
  expect(screen.queryByTestId('pinned-strip')).toBeNull();
});

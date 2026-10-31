import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { Alert, AlertButton } from 'react-native';
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
let mockHomeView: string | null = null;
const mockRemove = jest.fn((_id: string) => Promise.resolve());
const mockRefresh = jest.fn(() => Promise.resolve());
// Stable across renders, as the real provider's services are.
const mockServices = {
  store: {
    loadImage: () => Promise.resolve(null),
    remove: (id: string) => mockRemove(id),
    count: () => Promise.resolve(mockCards.length),
    lastChangeAt: () => Promise.resolve(1_000),
  },
  settings: {
    getNumber: (key: string) => Promise.resolve(key === 'lastExportAt' && mockLastExportAt ? Number(mockLastExportAt) : null),
    get: (key: string) => Promise.resolve(key === 'homeView' ? mockHomeView : null),
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
    refresh: mockRefresh,
  }),
}));

beforeEach(() => {
  mockPush.mockClear();
  mockSettingsSet.mockClear();
  mockRemove.mockClear();
  mockRefresh.mockClear();
  mockHomeView = null;
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

test('there is no backup banner on the home screen, even before the first backup', async () => {
  mockLastExportAt = null;
  await renderHome();
  await act(async () => {});
  expect(screen.queryByText('Back up your cards')).toBeNull();
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

describe('gallery view', () => {
  let alert: jest.SpyInstance;
  beforeEach(() => {
    alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });
  afterEach(() => alert.mockRestore());
  // Presses the button labelled `text` in the alert that was just shown.
  const answer = async (text: string) => {
    const buttons = alert.mock.calls.at(-1)?.[2] as AlertButton[];
    await act(async () => buttons.find((b) => b.text === text)?.onPress?.());
  };
  const showGallery = async () => {
    await renderHome();
    await act(async () => fireEvent.press(screen.getByTestId('gallery-toggle')));
  };

  test('shows every card in a grid instead of the stack, and remembers the choice', async () => {
    await showGallery();
    expect(screen.getByTestId('card-grid')).toBeTruthy();
    expect(screen.queryByTestId('card-stack')).toBeNull();
    for (const id of ['a', 'b', 'c']) expect(screen.getByTestId(`grid-${id}`)).toBeTruthy();
    // Each tile has the card's name and its category.
    expect(within(screen.getByTestId('grid-b')).getByText('Health insurance')).toBeTruthy();
    expect(within(screen.getByTestId('grid-b')).getByText(strings.categories.insurance)).toBeTruthy();
    expect(mockSettingsSet).toHaveBeenCalledWith('homeView', 'gallery');

    await act(async () => fireEvent.press(screen.getByTestId('gallery-toggle')));
    expect(screen.queryByTestId('card-grid')).toBeNull();
    expect(mockSettingsSet).toHaveBeenLastCalledWith('homeView', 'stack');
  });

  test('opens in the gallery when that was the last choice', async () => {
    mockHomeView = 'gallery';
    await render(<Home />);
    expect(await screen.findByTestId('card-grid')).toBeTruthy();
  });

  test('a tap opens the card', async () => {
    await showGallery();
    await fireEvent.press(screen.getByTestId('grid-b'));
    expect(mockPush).toHaveBeenLastCalledWith('/card/b');
  });

  test('a long-press starts selecting; then taps add and remove cards', async () => {
    await showGallery();
    expect(screen.queryByTestId('selection-bar')).toBeNull();
    await act(async () => fireEvent(screen.getByTestId('grid-a'), 'longPress'));
    expect(screen.getByText(strings.home.selected(1))).toBeTruthy();
    expect(screen.queryByTestId('add-card')).toBeNull();

    await act(async () => fireEvent.press(screen.getByTestId('grid-c')));
    expect(screen.getByText(strings.home.selected(2))).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
    await act(async () => fireEvent.press(screen.getByTestId('grid-a')));
    expect(screen.getByText(strings.home.selected(1))).toBeTruthy();

    await act(async () => fireEvent.press(screen.getByTestId('selection-cancel')));
    expect(screen.queryByTestId('selection-bar')).toBeNull();
    expect(screen.getByTestId('add-card')).toBeTruthy();
  });

  test('deletes only the selected cards, after a confirmation', async () => {
    await showGallery();
    await act(async () => fireEvent(screen.getByTestId('grid-a'), 'longPress'));
    await act(async () => fireEvent.press(screen.getByTestId('grid-c')));
    await act(async () => fireEvent.press(screen.getByTestId('selection-delete')));
    expect(alert).toHaveBeenCalledWith(
      strings.home.deleteSelectedTitle(2),
      strings.home.deleteSelectedBody(2),
      expect.any(Array),
    );
    await answer(strings.common.cancel);
    expect(mockRemove).not.toHaveBeenCalled();

    await act(async () => fireEvent.press(screen.getByTestId('selection-delete')));
    await answer(strings.common.delete);
    expect(mockRemove.mock.calls.map(([id]) => id)).toEqual(['a', 'c']);
    expect(mockRefresh).toHaveBeenCalled();
    expect(screen.queryByTestId('selection-bar')).toBeNull();
  });

  test('a filter that hides a selected card leaves it out of the delete', async () => {
    await showGallery();
    await act(async () => fireEvent(screen.getByTestId('grid-a'), 'longPress'));
    await act(async () => fireEvent.press(screen.getByTestId('grid-b')));
    await act(async () => fireEvent.press(screen.getByRole('radio', { name: strings.categories.insurance })));
    expect(screen.getByText(strings.home.selected(1))).toBeTruthy();
    await act(async () => fireEvent.press(screen.getByTestId('selection-delete')));
    await answer(strings.common.delete);
    expect(mockRemove.mock.calls.map(([id]) => id)).toEqual(['b']);
  });
});

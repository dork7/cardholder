import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { Alert, AlertButton } from 'react-native';
import { makeCard } from '../../../test/fixtures';
import { Folder } from '../types';
import Home from '../../../app/index';
import { FREE_CARD_LIMIT } from '../../config';
import { strings } from '../../strings';

let mockCards = [
  makeCard({ id: 'a', name: 'Emirates ID', tags: ['ID'] }),
  makeCard({ id: 'b', name: 'Health insurance', tags: ['Insurance'] }),
  makeCard({ id: 'c', name: 'Gym', tags: ['Membership'] }),
];

const mockPush = jest.fn();
// Folders are hidden in the app for now (FOLDERS_ENABLED); these tests cover both ways.
let mockFoldersEnabled = true;
jest.mock('../../config', () =>
  Object.defineProperty({ ...jest.requireActual('../../config') }, 'FOLDERS_ENABLED', {
    get: () => mockFoldersEnabled,
  }),
);
const mockShareCards = jest.fn((_store: unknown, _cards: { id: string }[]) => Promise.resolve());
jest.mock('../../share/shareCard', () => ({
  PdfUnavailableError: class extends Error {},
  shareCards: (store: unknown, cards: { id: string }[]) => mockShareCards(store, cards),
}));
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
let mockSeenTips: string | null = null;
let mockStackVertical = false;
const mockRemove = jest.fn((_id: string) => Promise.resolve());
const mockSetPinned = jest.fn((_id: string, _pinned: boolean) => Promise.resolve());
const mockUpdate = jest.fn((_id: string, _fields: { tags?: string[] }) => Promise.resolve());
const mockRefresh = jest.fn(() => Promise.resolve());
jest.mock('../../analysis/readPhoto', () => ({ canReadText: true, readPhotoText: async (jpeg: string) => `TEXT ${jpeg}` }));
// Stable across renders, as the real provider's services are.
const mockServices = {
  store: {
    loadImage: (id: string, side: string) => Promise.resolve(`${id}-${side}`),
    get: (id: string) => Promise.resolve(mockCards.find((c) => c.id === id) ?? null),
    moveToRecentlyDeleted: (id: string) => mockRemove(id),
    setPinned: (id: string, pinned: boolean) => mockSetPinned(id, pinned),
    update: (id: string, fields: { tags?: string[] }) => mockUpdate(id, fields),
    count: () => Promise.resolve(mockCards.length),
    lastChangeAt: () => Promise.resolve(1_000),
  },
  settings: {
    getNumber: (key: string) => Promise.resolve(key === 'lastExportAt' && mockLastExportAt ? Number(mockLastExportAt) : null),
    get: (key: string) => Promise.resolve(key === 'homeView' ? mockHomeView : key === 'seenTips' ? mockSeenTips : null),
    set: mockSettingsSet,
  },
};
let mockWarnIdShare = true;
const mockSetWarnIdShare = jest.fn((_on: boolean) => Promise.resolve());
jest.mock('../../app/AppProvider', () => ({
  useApp: () => ({
    warnIdShare: mockWarnIdShare,
    setWarnIdShare: (on: boolean) => mockSetWarnIdShare(on),
    cards: mockCards,
    folders: mockFolders,
    unlocked: mockUnlocked,
    services: mockServices,
    openImportOnReady: false,
    clearOpenImport: () => {},
    appearance: 'system',
    setAppearance: mockSetAppearance,
    homeFolders: mockHomeFolders,
    refresh: mockRefresh,
    stackVertical: mockStackVertical,
    undo: mockUndo,
  }),
}));
const mockUndo: import('../../app/undo').Undo = jest.requireActual('../../app/undo').createUndo();

beforeEach(() => {
  mockWarnIdShare = true;
  mockSetWarnIdShare.mockClear();
  mockPush.mockClear();
  mockSettingsSet.mockClear();
  mockRemove.mockClear();
  mockShareCards.mockClear();
  mockSetPinned.mockClear();
  mockUpdate.mockClear();
  mockRefresh.mockClear();
  mockHomeView = null;
  // Most tests are about other things, so the gesture tips count as seen unless a test says otherwise.
  mockSeenTips = 'stack,gallery';
  mockStackVertical = false;
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

test('the stack shows every card until a tag is chosen', async () => {
  await renderHome();
  expect(screen.getByTestId('card-stack').props.accessibilityValue).toEqual({ text: strings.home.cardOf(1, 3) });
});

test('choosing a tag narrows the stack to the cards that have it', async () => {
  await renderHome();
  await act(async () => fireEvent.press(screen.getByRole('radio', { name: 'Insurance' })));
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

test('folder choices are radios in a group; Manage is a button outside it', async () => {
  mockFolders = [{ id: 'f1', name: 'Health', createdAt: 1 }];
  await renderHome();
  // A radiogroup View isn't itself focusable (that would hide its radios), so it's found by test ID.
  const groupView = screen.getByTestId('folder-filter-choices');
  expect(groupView.props.accessibilityRole).toBe('radiogroup');
  expect(groupView.props.accessibilityLabel).toBe(strings.folders.title);
  const group = within(groupView);
  expect(group.getByRole('radio', { name: strings.folders.all }).props.accessibilityState).toEqual({ checked: true });
  expect(group.getByRole('radio', { name: 'Health' }).props.accessibilityState).toEqual({ checked: false });
  expect(group.queryByRole('button', { name: strings.folders.manage })).toBeNull();
  expect(screen.getByRole('button', { name: strings.folders.manage })).toBeTruthy();
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

test('only tags some card has are offered, after All', async () => {
  await renderHome();
  expect(screen.getByRole('radio', { name: strings.home.allTags }).props.accessibilityState).toMatchObject({ checked: true });
  expect(screen.getByRole('radio', { name: 'ID' })).toBeTruthy();
  expect(screen.queryByRole('radio', { name: 'Vehicle' })).toBeNull();
});

test('with no tags on any card there is nothing to filter, so no filter is shown', async () => {
  const all = mockCards;
  mockCards = [makeCard({ id: 'a', name: 'Emirates ID', tags: [] }), makeCard({ id: 'b', name: 'Visa', tags: [] })];
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

test('adding an eleventh document opens the paywall', async () => {
  await withCards(fullWallet(), async () => {
    await renderHome();
    await fireEvent.press(screen.getByTestId('add-card'));
    expect(mockPush).toHaveBeenLastCalledWith('/paywall');
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

test('the empty state names the Add image button and sends no one to another app', async () => {
  await withCards([], async () => {
    await renderHome();
    const hint = screen.getByText(strings.home.emptyHint);
    expect(hint.props.children).toContain('Add image');
    expect(hint.props.children).not.toMatch(/camera app|\+/);
  });
});

test('pinned cards appear on the home page, stay put while searching, and open on tap', async () => {
  await withCards(
    [
      makeCard({ id: 'a', name: 'Emirates ID', tags: ['ID'], pinned: true }),
      makeCard({ id: 'b', name: 'Gym', tags: ['Membership'] }),
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
    // Each tile has the card's name and its tags.
    expect(within(screen.getByTestId('grid-b')).getByText('Health insurance')).toBeTruthy();
    expect(within(screen.getByTestId('grid-b')).getByText('Insurance')).toBeTruthy();
    expect(mockSettingsSet).toHaveBeenCalledWith('homeView', 'gallery');

    await act(async () => fireEvent.press(screen.getByTestId('gallery-toggle')));
    expect(screen.queryByTestId('card-grid')).toBeNull();
    expect(mockSettingsSet).toHaveBeenLastCalledWith('homeView', 'stack');
  });

  test('the view toggle names the view it switches to; a screen reader hears one Gallery view switch', async () => {
    await renderHome();
    const toggle = () => screen.getByTestId('gallery-toggle');
    expect(within(toggle()).getByText('Gallery')).toBeTruthy();
    expect(toggle().props.accessibilityRole).toBe('switch');
    expect(toggle().props.accessibilityLabel).toBe('Gallery view');
    expect(toggle().props.accessibilityState).toEqual({ checked: false });

    await act(async () => fireEvent.press(toggle()));
    expect(within(toggle()).getByText('Stack')).toBeTruthy();
    expect(within(toggle()).queryByText('Gallery')).toBeNull();
    expect(toggle().props.accessibilityLabel).toBe('Gallery view');
    expect(toggle().props.accessibilityState).toEqual({ checked: true });
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

  test('a screen reader can start selecting from the actions menu instead of a long-press', async () => {
    await showGallery();
    const tile = screen.getByTestId('grid-a');
    expect(tile.props.accessibilityActions).toEqual([{ name: 'select', label: strings.home.selectAction }]);
    await act(async () => fireEvent(tile, 'accessibilityAction', { nativeEvent: { actionName: 'select' } }));
    expect(screen.getByText(strings.home.selected(1))).toBeTruthy();
    // While selecting, a tap is the way to add or remove a card, so the action goes.
    expect(screen.getByTestId('grid-a').props.accessibilityActions).toBeUndefined();
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
    await act(async () => fireEvent.press(screen.getByRole('radio', { name: 'Insurance' })));
    expect(screen.getByText(strings.home.selected(1))).toBeTruthy();
    await act(async () => fireEvent.press(screen.getByTestId('selection-delete')));
    await answer(strings.common.delete);
    expect(mockRemove.mock.calls.map(([id]) => id)).toEqual(['b']);
  });

  // The grid's cards, in the order shown.
  const gridOrder = () => screen.getAllByTestId(/^grid-/).map((el) => el.props.testID.slice('grid-'.length));
  const select = async (...ids: string[]) => {
    await act(async () => fireEvent(screen.getByTestId(`grid-${ids[0]}`), 'longPress'));
    for (const id of ids.slice(1)) await act(async () => fireEvent.press(screen.getByTestId(`grid-${id}`)));
  };

  // Opens the Sort sheet, presses one of its options, then closes it with Done.
  const chooseSort = async (testID: string) => {
    await act(async () => fireEvent.press(screen.getByTestId('sort-chip')));
    await act(async () => fireEvent.press(within(screen.getByTestId('sort-sheet')).getByTestId(testID)));
    await act(async () => fireEvent.press(screen.getByTestId('sort-sheet-done')));
  };

  test('one Sort chip replaces the row of sort chips', async () => {
    await showGallery();
    expect(screen.getByRole('button', { name: strings.home.sortChip(strings.home.sortName) })).toBeTruthy();
    expect(screen.queryByTestId('sort-expiry')).toBeNull();
    expect(screen.queryByTestId('filter-expiring')).toBeNull();
  });

  test('the Sort sheet offers the order as radios and Expiring soon as a checkbox', async () => {
    await showGallery();
    await act(async () => fireEvent.press(screen.getByTestId('sort-chip')));
    const sheet = within(screen.getByTestId('sort-sheet'));
    expect(sheet.getByRole('radio', { name: strings.home.sortName }).props.accessibilityState).toEqual({ checked: true });
    expect(sheet.getByRole('radio', { name: strings.home.sortExpiry }).props.accessibilityState).toEqual({ checked: false });
    expect(sheet.getByRole('radio', { name: strings.home.sortAdded })).toBeTruthy();
    expect(sheet.getByRole('checkbox', { name: strings.home.expiringSoon }).props.accessibilityState).toEqual({ checked: false });
    await act(async () => fireEvent.press(sheet.getByRole('checkbox', { name: strings.home.expiringSoon })));
    expect(sheet.getByRole('checkbox', { name: strings.home.expiringSoon }).props.accessibilityState).toEqual({ checked: true });
    await act(async () => fireEvent.press(screen.getByTestId('sort-sheet-done')));
    expect(screen.queryByTestId('sort-sheet')).toBeNull();
    expect(screen.getByTestId('sort-chip')).toHaveTextContent(
      strings.home.sortChip(strings.home.sortName, true),
    );
  });

  test('sorts by name, expiry or newest, and remembers the choice', async () => {
    await withCards(
      [
        makeCard({ id: 'a', name: 'Alpha', expiresOn: '2030-01-01', createdAt: 1 }),
        makeCard({ id: 'b', name: 'Bravo', expiresOn: '2028-01-01', createdAt: 3 }),
        makeCard({ id: 'c', name: 'Charlie', expiresOn: null, createdAt: 2 }),
      ],
      async () => {
        await showGallery();
        expect(gridOrder()).toEqual(['a', 'b', 'c']);
        expect(screen.getByTestId('sort-chip')).toHaveTextContent(strings.home.sortChip(strings.home.sortName));
        await chooseSort('sort-expiry');
        expect(gridOrder()).toEqual(['b', 'a', 'c']);
        expect(mockSettingsSet).toHaveBeenLastCalledWith('gallerySort', 'expiry');
        expect(screen.getByTestId('sort-chip')).toHaveTextContent(strings.home.sortChip(strings.home.sortExpiry));
        await chooseSort('sort-added');
        expect(gridOrder()).toEqual(['b', 'c', 'a']);
      },
    );
  });

  test('"Expiring soon" shows only cards that are expired or due within the reminder window', async () => {
    const inDays = (days: number) => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    await withCards(
      [
        makeCard({ id: 'soon', name: 'Soon', expiresOn: inDays(5) }),
        makeCard({ id: 'late', name: 'Later', expiresOn: inDays(200) }),
        makeCard({ id: 'gone', name: 'Gone', expiresOn: inDays(-3) }),
        makeCard({ id: 'none', name: 'None' }),
      ],
      async () => {
        await showGallery();
        await chooseSort('filter-expiring');
        expect(gridOrder()).toEqual(['gone', 'soon']);
        await chooseSort('filter-expiring');
        expect(gridOrder()).toHaveLength(4);
      },
    );
  });

  test('says so when nothing is expiring soon', async () => {
    await showGallery();
    await chooseSort('filter-expiring');
    expect(screen.getByText(strings.home.noneExpiring(30))).toBeTruthy();
  });

  test('every selection-bar action has a word under its icon, and keeps its full name for screen readers', async () => {
    await showGallery();
    await select('a');
    const captions: [string, string, string][] = [
      ['selection-pin', 'Pin', strings.home.pinSelected],
      ['selection-tags', 'Tag', strings.home.tagSelected],
      ['selection-recreate', 'Read again', strings.recreate.button],
      ['selection-share', 'Share', strings.home.shareSelected],
      ['selection-delete', 'Delete', strings.home.deleteSelected],
    ];
    for (const [id, caption, label] of captions) {
      expect(within(screen.getByTestId(id)).getByText(caption)).toBeTruthy();
      expect(screen.getByTestId(id).props.accessibilityLabel).toBe(label);
    }
  });

  test('the pin caption reads Unpin when every selected card is pinned', async () => {
    await withCards([makeCard({ id: 'p', name: 'Pinned', pinned: true })], async () => {
      await showGallery();
      await select('p');
      expect(within(screen.getByTestId('selection-pin')).getByText('Unpin')).toBeTruthy();
    });
  });

  test('pins the selected cards; when all are pinned, the same button unpins them', async () => {
    await showGallery();
    await select('a', 'c');
    expect(screen.getByRole('button', { name: strings.home.pinSelected })).toBeTruthy();
    await act(async () => fireEvent.press(screen.getByTestId('selection-pin')));
    expect(mockSetPinned.mock.calls).toEqual([
      ['a', true],
      ['c', true],
    ]);
    expect(mockRefresh).toHaveBeenCalled();
    expect(screen.queryByTestId('selection-bar')).toBeNull();
  });

  test('offers Unpin when every selected card is pinned', async () => {
    await withCards([makeCard({ id: 'p', name: 'Pinned', pinned: true }), makeCard({ id: 'q', name: 'Other' })], async () => {
      await showGallery();
      await select('p');
      await act(async () => fireEvent.press(screen.getByRole('button', { name: strings.home.unpinSelected })));
      expect(mockSetPinned).toHaveBeenCalledWith('p', false);
    });
  });

  test('adds the tags chosen to every selected card, leaving the rest', async () => {
    await showGallery();
    await select('a', 'c');
    await act(async () => fireEvent.press(screen.getByTestId('selection-tags')));
    expect(screen.getByText(strings.home.tagTo(2))).toBeTruthy();
    await act(async () => fireEvent.changeText(screen.getByTestId('tag-input'), 'Work'));
    await act(async () => fireEvent.press(screen.getByTestId('tag-input-add')));
    await act(async () => fireEvent.changeText(screen.getByTestId('tag-input'), 'Family'));
    await act(async () => fireEvent.press(screen.getByTestId('tag-input-add')));
    await act(async () => fireEvent.press(screen.getByTestId('tag-sheet-apply')));
    expect(mockUpdate.mock.calls.map(([id, f]) => [id, f.tags])).toEqual([
      ['a', ['ID', 'Work', 'Family']],
      ['c', ['Membership', 'Work', 'Family']],
    ]);
    expect(screen.queryByTestId('selection-bar')).toBeNull();
  });

  test('Recreate .md reads each selected document again, then says so', async () => {
    await showGallery();
    await select('a', 'c');
    await act(async () => fireEvent.press(screen.getByTestId('selection-recreate')));
    expect(mockUpdate.mock.calls.map(([id, f]) => [id, (f as unknown as { readText: unknown }).readText])).toEqual([
      ['a', { front: 'TEXT a-front', back: '' }],
      ['c', { front: 'TEXT c-front', back: '' }],
    ]);
    expect(alert).toHaveBeenCalledWith(strings.recreate.button, strings.recreate.doneMany(2));
    expect(screen.queryByTestId('selection-bar')).toBeNull();
  });

  test('shares the selected cards together, in the order shown, and keeps the selection', async () => {
    await showGallery();
    await select('c', 'b');
    await act(async () => fireEvent.press(screen.getByTestId('selection-share')));
    // Gym and Health insurance: no ID, so no warning first.
    expect(alert).not.toHaveBeenCalled();
    expect(mockShareCards.mock.calls[0][1].map((c) => c.id)).toEqual(['c', 'b']);
    expect(screen.getByTestId('selection-bar')).toBeTruthy();
  });

  test('asks first when an ID is among them', async () => {
    await showGallery();
    await select('a', 'b');
    await act(async () => fireEvent.press(screen.getByTestId('selection-share')));
    expect(alert).toHaveBeenCalledWith(strings.home.shareIdsTitle, strings.home.shareIdsBody, expect.any(Array));
    expect(mockShareCards).not.toHaveBeenCalled();
    await answer(strings.idShare.share);
    expect(mockShareCards.mock.calls[0][1].map((c) => c.id)).toEqual(['a', 'b']);
  });

  test("Don't ask again shares the selection and turns the ID warning off", async () => {
    await showGallery();
    await select('a', 'b');
    await act(async () => fireEvent.press(screen.getByTestId('selection-share')));
    await answer(strings.idShare.dontAskAgain);
    expect(mockSetWarnIdShare).toHaveBeenCalledWith(false);
    expect(mockShareCards.mock.calls[0][1].map((c) => c.id)).toEqual(['a', 'b']);
  });

  test('with the ID warning off, a selection with an ID shares without asking', async () => {
    mockWarnIdShare = false;
    await showGallery();
    await select('a', 'b');
    await act(async () => fireEvent.press(screen.getByTestId('selection-share')));
    expect(alert).not.toHaveBeenCalled();
    expect(mockShareCards.mock.calls[0][1].map((c) => c.id)).toEqual(['a', 'b']);
  });
});

test('a purchased unlock allows adding past ten documents', async () => {
  mockUnlocked = true;
  await withCards(fullWallet(), async () => {
    await renderHome();
    await fireEvent.press(screen.getByTestId('add-card'));
    expect(mockPush).toHaveBeenLastCalledWith('/edit/new');
  });
});

describe('gesture tips', () => {
  test('the first stack shows a tip on how to browse it', async () => {
    mockSeenTips = null;
    await renderHome();
    expect(await screen.findByText(strings.home.stackTip)).toBeTruthy();
  });

  test('dismissing the stack tip hides it for good', async () => {
    mockSeenTips = null;
    await renderHome();
    await act(async () => fireEvent.press(await screen.findByRole('button', { name: strings.home.dismissTip })));
    expect(screen.queryByText(strings.home.stackTip)).toBeNull();
    expect(mockSettingsSet).toHaveBeenCalledWith('seenTips', expect.stringMatching(/(^|,)stack(,|$)/));
  });

  test('swiping the stack hides its tip for good', async () => {
    mockSeenTips = null;
    await renderHome();
    await screen.findByText(strings.home.stackTip);
    fireEvent(screen.getByTestId('card-stack'), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    await waitFor(() => expect(screen.queryByText(strings.home.stackTip)).toBeNull());
    expect(mockSettingsSet).toHaveBeenCalledWith('seenTips', expect.stringMatching(/(^|,)stack(,|$)/));
  });

  test('a stack tip seen before a restart stays hidden', async () => {
    mockSeenTips = 'stack.read,stack';
    await renderHome();
    await act(async () => {});
    expect(screen.queryByText(strings.home.stackTip)).toBeNull();
  });

  test('with vertical swipe on, the tip says to swipe up', async () => {
    mockSeenTips = null;
    mockStackVertical = true;
    await renderHome();
    expect(await screen.findByText(strings.home.stackTipVertical)).toBeTruthy();
    expect(screen.queryByText(strings.home.stackTip)).toBeNull();
  });

  test('the tip is read out to screen readers only the first time it shows', async () => {
    mockSeenTips = null;
    await renderHome();
    const first = await screen.findByText(strings.home.stackTip);
    expect(first.props.accessibilityLiveRegion).toBe('polite');
    expect(mockSettingsSet).toHaveBeenCalledWith('seenTips', 'stack.read');
  });

  test('a tip already read out once stays quiet on the next visit', async () => {
    mockSeenTips = 'stack.read';
    await renderHome();
    const again = await screen.findByText(strings.home.stackTip);
    expect(again.props.accessibilityLiveRegion).toBe('none');
  });

  describe('in the gallery', () => {
    const showGallery = async () => {
      await renderHome();
      await act(async () => fireEvent.press(screen.getByTestId('gallery-toggle')));
    };

    test('the first gallery shows a tip on selecting', async () => {
      mockSeenTips = 'stack';
      await showGallery();
      expect(await screen.findByText(strings.home.galleryTip)).toBeTruthy();
      // Each view has its own tip.
      expect(screen.queryByText(strings.home.stackTip)).toBeNull();
    });

    test('dismissing the gallery tip hides it for good', async () => {
      mockSeenTips = 'stack';
      await showGallery();
      await act(async () => fireEvent.press(await screen.findByRole('button', { name: strings.home.dismissTip })));
      expect(screen.queryByText(strings.home.galleryTip)).toBeNull();
      expect(mockSettingsSet).toHaveBeenCalledWith('seenTips', expect.stringMatching(/(^|,)gallery(,|$)/));
    });

    test('selecting with a long-press hides the gallery tip for good', async () => {
      mockSeenTips = 'stack';
      await showGallery();
      await screen.findByText(strings.home.galleryTip);
      await act(async () => fireEvent(screen.getByTestId('grid-a'), 'longPress'));
      await act(async () => fireEvent.press(screen.getByTestId('selection-cancel')));
      expect(screen.queryByText(strings.home.galleryTip)).toBeNull();
      expect(mockSettingsSet).toHaveBeenCalledWith('seenTips', expect.stringMatching(/(^|,)gallery(,|$)/));
    });

    test('a gallery tip seen before a restart stays hidden', async () => {
      mockSeenTips = 'stack,gallery.read,gallery';
      await showGallery();
      await act(async () => {});
      expect(screen.queryByText(strings.home.galleryTip)).toBeNull();
    });
  });
});

describe('Undo bar', () => {
  afterEach(() => act(() => mockUndo.end()));

  test('nothing removed, no Undo bar', async () => {
    await render(<Home />);
    expect(screen.queryByTestId('undo-bar')).toBeNull();
  });

  test('says what was deleted, is announced, and its labelled Undo button puts it back', async () => {
    const putBack = jest.fn(() => Promise.resolve());
    await render(<Home />);
    await act(() => mockUndo.offer({ message: 'Deleted Gym', undo: putBack }));
    const message = within(screen.getByTestId('undo-bar')).getByText('Deleted Gym');
    expect(message.props.accessibilityLiveRegion).toBe('polite');
    await fireEvent.press(screen.getByRole('button', { name: strings.undo.undo }));
    expect(putBack).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('undo-bar')).toBeNull();
  });

  test('goes away by itself after 5 seconds', async () => {
    jest.useFakeTimers();
    try {
      await render(<Home />);
      await act(() => mockUndo.offer({ message: 'Deleted Gym', undo: () => Promise.resolve() }));
      expect(screen.getByTestId('undo-bar')).toBeTruthy();
      await act(() => jest.advanceTimersByTime(5000));
      expect(screen.queryByTestId('undo-bar')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  test('an Undo that fails says so', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await render(<Home />);
    await act(() => mockUndo.offer({ message: 'Deleted Gym', undo: () => Promise.reject(new Error('disk')) }));
    await fireEvent.press(screen.getByRole('button', { name: strings.undo.undo }));
    expect(alert).toHaveBeenCalledWith(strings.common.error);
    alert.mockRestore();
    warn.mockRestore();
  });
});

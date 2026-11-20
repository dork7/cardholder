import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { Alert, AlertButton } from 'react-native';
import { makeCard } from '../../../test/fixtures';
import { Note } from '../../notes/noteStore';
import { Folder } from '../types';
import Home from '../../../app/index';
import { FREE_CARD_LIMIT } from '../../config';
import { strings } from '../../strings';

let mockCards = [
  makeCard({ id: 'a', name: 'Emirates ID', tags: ['ID'] }),
  makeCard({ id: 'b', name: 'Health insurance', tags: ['Insurance'] }),
  makeCard({ id: 'c', name: 'Gym', tags: ['Membership'] }),
];

let mockNotes: Note[] = [];

const mockPush = jest.fn();
const mockReplace = jest.fn();
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
    useRouter: () => ({ push: mockPush, replace: mockReplace }),
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
let mockGallerySort: string | null = null;
let mockGalleryExpiring: string | null = null;
const mockRemove = jest.fn((_id: string) => Promise.resolve());
const mockRestore = jest.fn((_id: string) => Promise.resolve());
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
    restore: (id: string) => mockRestore(id),
    setPinned: (id: string, pinned: boolean) => mockSetPinned(id, pinned),
    update: (id: string, fields: { tags?: string[] }) => mockUpdate(id, fields),
    count: () => Promise.resolve(mockCards.length),
    lastChangeAt: () => Promise.resolve(1_000),
  },
  settings: {
    getNumber: (key: string) => Promise.resolve(key === 'lastExportAt' && mockLastExportAt ? Number(mockLastExportAt) : null),
    get: (key: string) =>
      Promise.resolve(
        key === 'homeView' ? mockHomeView
          : key === 'seenTips' ? mockSeenTips
          : key === 'gallerySort' ? mockGallerySort
          : key === 'galleryExpiring' ? mockGalleryExpiring
          : null,
      ),
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
    notes: mockNotes,
    folders: mockFolders,
    unlocked: mockUnlocked,
    services: mockServices,
    openImportOnReady: false,
    clearOpenImport: () => {},
    appearance: 'system',
    setAppearance: mockSetAppearance,
    homeFolders: mockHomeFolders,
    refresh: mockRefresh,
    undo: mockUndo,
  }),
}));
const mockUndo: import('../../app/undo').Undo = jest.requireActual('../../app/undo').createUndo();

beforeEach(() => {
  mockNotes = [];
  mockWarnIdShare = true;
  mockSetWarnIdShare.mockClear();
  mockPush.mockClear();
  mockSettingsSet.mockClear();
  mockRemove.mockClear();
  mockRestore.mockClear();
  mockShareCards.mockClear();
  mockSetPinned.mockClear();
  mockUpdate.mockClear();
  mockRefresh.mockClear();
  mockHomeView = 'list';
  // Most tests are about other things, so the gesture tips count as seen unless a test says otherwise.
  mockSeenTips = 'gallery';
  mockGallerySort = null;
  mockGalleryExpiring = null;
  mockUnlocked = false;
  mockFolders = [];
  mockHomeFolders = { filter: true, manage: true };
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

async function renderHome() {
  await render(<Home />);
}

test('a saved Stack choice migrates to List without changing documents or pins', async () => {
  mockHomeView = 'stack';
  await withCards([makeCard({ id: 'pin', pinned: true }), makeCard({ id: 'other' })], async () => {
    await renderHome();
    expect(await screen.findByTestId('document-list')).toBeTruthy();
    expect(screen.getByTestId('pinned-pin')).toBeTruthy();
    expect(screen.getByTestId('row-other')).toBeTruthy();
    expect(screen.queryByTestId('view-stack')).toBeNull();
    expect(mockSettingsSet).toHaveBeenCalledWith('homeView', 'list');
  });
});

test('a saved Gallery choice still opens the grid', async () => {
  mockHomeView = 'gallery';
  await renderHome();
  expect(await screen.findByTestId('card-grid')).toBeTruthy();
  expect(mockSettingsSet).not.toHaveBeenCalledWith('homeView', 'list');
});
test('home does not show a folder filter', async () => {
  mockFolders = [{ id: 'f1', name: 'Health', createdAt: 1 }];
  await renderHome();
  expect(screen.queryByTestId('folder-filter-choices')).toBeNull();
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

test('document search settles after 250 ms, finds Details (.md), and cancels stale searches', async () => {
  jest.useFakeTimers();
  mockHomeView = 'list';
  try {
    await withCards([
      makeCard({ id: 'title', name: 'Acme policy' }),
      makeCard({ id: 'details', name: 'Insurance', readText: { front: 'Employer: ACME LLC', back: '' } }),
      makeCard({ id: 'other', name: 'Gym' }),
    ], async () => {
      await render(<Home />);
      await act(async () => fireEvent.changeText(screen.getByTestId('search'), 'acme'));
      expect(screen.getByTestId('row-title')).toBeTruthy();
      expect(screen.getByTestId('row-details')).toBeTruthy();
      await act(async () => jest.advanceTimersByTime(249));
      expect(screen.getByTestId('row-other')).toBeTruthy();
      await act(async () => { jest.advanceTimersByTime(1); await Promise.resolve(); });
      expect(screen.queryByTestId('row-other')).toBeNull();
      await act(async () => { jest.advanceTimersByTime(1); await Promise.resolve(); });
      expect(screen.getByTestId('row-details')).toBeTruthy();

      await act(async () => fireEvent.changeText(screen.getByTestId('search'), 'missing'));
      await act(async () => fireEvent.changeText(screen.getByTestId('search'), 'gym'));
      await act(async () => { jest.advanceTimersByTime(251); await Promise.resolve(); });
      expect(screen.getByTestId('row-other')).toBeTruthy();
      expect(screen.queryByTestId('row-details')).toBeNull();
      await act(async () => fireEvent.press(screen.getByRole('button', { name: strings.home.clearSearch })));
      expect(screen.getByTestId('row-details')).toBeTruthy();
    });
  } finally {
    jest.useRealTimers();
  }
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
  mockHomeView = 'list';
  await withCards([makeCard({ id: 'new', name: 'New document' })], async () => {
    await render(<Home />);
    expect(screen.queryByTestId('pinned-section')).toBeNull();
    expect(screen.getByTestId('row-new')).toBeTruthy();
  });
});

describe('document library (the default view)', () => {
  const cards = [
    makeCard({ id: 'a', name: 'Emirates ID', tags: ['ID'], pinned: true }),
    makeCard({ id: 'b', name: 'Gym', tags: ['Membership'] }),
    makeCard({ id: 'c', name: 'Car insurance', tags: ['Insurance'] }),
  ];
  beforeEach(() => {
    mockHomeView = null;
  });

  test('shows the subtitle, pinned panels and every other document with a count, as headings', async () => {
    await withCards(cards, async () => {
      await render(<Home />);
      expect(screen.getByText(strings.home.subtitle)).toBeTruthy();
      expect(screen.getByRole('header', { name: strings.home.pinnedForQuickAccess })).toBeTruthy();
      expect(screen.getByRole('header', { name: strings.home.allDocuments })).toBeTruthy();
      expect(screen.getByText(strings.home.documentCount(2))).toBeTruthy();
      expect(screen.getByTestId('pinned-a')).toBeTruthy();
      expect(screen.getByTestId('row-b')).toBeTruthy();
      expect(screen.queryByTestId('row-a')).toBeNull();
      await fireEvent.press(screen.getByTestId('row-b'));
      expect(mockPush).toHaveBeenCalledWith('/card/b');
    });
  });

  test('tag chips sit above the list and narrow it; search keeps pinned panels in place', async () => {
    await withCards(cards, async () => {
      await render(<Home />);
      await act(async () => fireEvent.press(screen.getByRole('radio', { name: 'Insurance' })));
      expect(screen.getByTestId('row-c')).toBeTruthy();
      expect(screen.queryByTestId('row-b')).toBeNull();
      expect(screen.getByText(strings.home.documentCount(1))).toBeTruthy();
      expect(screen.getByTestId('pinned-a')).toBeTruthy();
    });
  });

  test('the tab bar marks Documents as the current tab and + adds a document', async () => {
    await render(<Home />);
    expect(screen.getByTestId('tab-documents').props.accessibilityState).toEqual({ selected: true });
    expect(screen.getByTestId('tab-notes').props.accessibilityState).toEqual({ selected: false });
    await fireEvent.press(screen.getByTestId('add-card'));
    expect(mockPush).toHaveBeenCalledWith('/edit/new');
  });
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
    await act(async () => fireEvent.press(screen.getByTestId('view-gallery')));
  };

  test('shows every card in a grid and remembers the choice', async () => {
    await renderHome();
    const gallery = screen.getByTestId('view-gallery');
    expect(gallery.props.accessibilityRole).toBe('button');
    expect(gallery.props.accessibilityState).toEqual({ selected: false });
    await act(async () => fireEvent.press(gallery));
    expect(screen.getByTestId('card-grid')).toBeTruthy();
    expect(screen.getByTestId('view-gallery').props.accessibilityState).toEqual({ selected: true });
    for (const id of ['a', 'b', 'c']) expect(screen.getByTestId(`grid-${id}`)).toBeTruthy();
    // Each tile has the card's name and its tags.
    expect(within(screen.getByTestId('grid-b')).getByText('Health insurance')).toBeTruthy();
    expect(within(screen.getByTestId('grid-b')).getByText('Insurance')).toBeTruthy();
    expect(mockSettingsSet).toHaveBeenCalledWith('homeView', 'gallery');

    await act(async () => fireEvent.press(screen.getByTestId('view-list')));
    expect(screen.getByTestId('document-list')).toBeTruthy();
    expect(mockSettingsSet).toHaveBeenLastCalledWith('homeView', 'list');
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
    for (const [id, caption] of [
      ['selection-pin', strings.home.pinCaption],
      ['selection-tags', strings.home.tagCaption],
      ['selection-recreate', strings.home.readAgainCaption],
      ['selection-share', strings.home.shareCaption],
      ['selection-delete', strings.home.deleteCaption],
    ]) expect(within(screen.getByTestId(id)).getByText(caption)).toBeTruthy();
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

  describe('deleting a selection', () => {
    afterEach(() => act(() => mockUndo.end()));

    test('deletes the selected documents at once, with no dialog, and ends selection', async () => {
      await showGallery();
      await act(async () => fireEvent(screen.getByTestId('grid-a'), 'longPress'));
      await act(async () => fireEvent.press(screen.getByTestId('grid-c')));
      await act(async () => fireEvent.press(screen.getByTestId('selection-delete')));
      expect(alert).not.toHaveBeenCalled();
      expect(mockRemove.mock.calls.map(([id]) => id).sort()).toEqual(['a', 'c']);
      expect(mockRefresh).toHaveBeenCalled();
      expect(screen.queryByTestId('selection-bar')).toBeNull();
    });

    test('the Undo bar counts them, and one Undo restores every one', async () => {
      await showGallery();
      await act(async () => fireEvent(screen.getByTestId('grid-a'), 'longPress'));
      await act(async () => fireEvent.press(screen.getByTestId('grid-c')));
      await act(async () => fireEvent.press(screen.getByTestId('selection-delete')));
      expect(within(screen.getByTestId('undo-bar')).getByText('Deleted 2 documents')).toBeTruthy();
      mockRefresh.mockClear();
      await act(async () => fireEvent.press(screen.getByRole('button', { name: strings.undo.undo })));
      expect(mockRestore.mock.calls.map(([id]) => id).sort()).toEqual(['a', 'c']);
      expect(mockRefresh).toHaveBeenCalled();
      expect(screen.queryByTestId('undo-bar')).toBeNull();
    });

    test('after 5 seconds the delete is final: the bar goes and nothing is restored', async () => {
      jest.useFakeTimers();
      try {
        await showGallery();
        await act(async () => fireEvent(screen.getByTestId('grid-b'), 'longPress'));
        await act(async () => fireEvent.press(screen.getByTestId('selection-delete')));
        expect(screen.getByTestId('undo-bar')).toBeTruthy();
        await act(() => jest.advanceTimersByTime(5000));
        expect(screen.queryByTestId('undo-bar')).toBeNull();
        expect(mockRestore).not.toHaveBeenCalled();
      } finally {
        jest.useRealTimers();
      }
    });

    test('a later removal replaces the offer, so Undo can only bring back the later one', async () => {
      await showGallery();
      await select('a', 'b');
      await act(async () => fireEvent.press(screen.getByTestId('selection-delete')));
      await select('c');
      await act(async () => fireEvent.press(screen.getByTestId('selection-delete')));
      expect(within(screen.getByTestId('undo-bar')).getByText('Deleted Gym')).toBeTruthy();
      await act(async () => fireEvent.press(screen.getByRole('button', { name: strings.undo.undo })));
      expect(mockRestore.mock.calls.map(([id]) => id)).toEqual(['c']);
    });

    test('documents that fail to delete are counted, and Undo offers only the rest', async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      mockRemove.mockImplementation((id: string) => (id === 'a' ? Promise.reject(new Error('disk')) : Promise.resolve()));
      try {
        await showGallery();
        await select('a', 'b', 'c');
        await act(async () => fireEvent.press(screen.getByTestId('selection-delete')));
        const { title, body } = strings.errors.deleteMany(1);
        expect(alert).toHaveBeenCalledWith(title, body);
        expect(title).toBe("Couldn't delete 1 document");
        expect(within(screen.getByTestId('undo-bar')).getByText('Deleted 2 documents')).toBeTruthy();
        await act(async () => fireEvent.press(screen.getByRole('button', { name: strings.undo.undo })));
        expect(mockRestore.mock.calls.map(([id]) => id).sort()).toEqual(['b', 'c']);
      } finally {
        mockRemove.mockImplementation(() => Promise.resolve());
        warn.mockRestore();
      }
    });

    test('when none can be deleted there is nothing to undo', async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      mockRemove.mockImplementation(() => Promise.reject(new Error('disk')));
      try {
        await showGallery();
        await select('a');
        await act(async () => fireEvent.press(screen.getByTestId('selection-delete')));
        expect(alert).toHaveBeenCalledWith(strings.errors.deleteMany(1).title, strings.errors.deleteMany(1).body);
        expect(screen.queryByTestId('undo-bar')).toBeNull();
      } finally {
        mockRemove.mockImplementation(() => Promise.resolve());
        warn.mockRestore();
      }
    });

    test('an Undo that cannot restore every document says so', async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      mockRestore.mockImplementation((id: string) => (id === 'a' ? Promise.reject(new Error('disk')) : Promise.resolve()));
      try {
        await showGallery();
        await select('a', 'c');
        await act(async () => fireEvent.press(screen.getByTestId('selection-delete')));
        await act(async () => fireEvent.press(screen.getByRole('button', { name: strings.undo.undo })));
        expect(mockRestore.mock.calls.map(([id]) => id).sort()).toEqual(['a', 'c']);
        expect(alert).toHaveBeenCalledWith(strings.errors.actions.undo.title, strings.errors.actions.undo.body);
      } finally {
        mockRestore.mockImplementation(() => Promise.resolve());
        warn.mockRestore();
      }
    });
  });

  test('a filter that hides a selected card leaves it out of the delete', async () => {
    await showGallery();
    await act(async () => fireEvent(screen.getByTestId('grid-a'), 'longPress'));
    await act(async () => fireEvent.press(screen.getByTestId('grid-b')));
    await act(async () => fireEvent.press(screen.getByRole('radio', { name: 'Insurance' })));
    expect(screen.getByText(strings.home.selected(1))).toBeTruthy();
    await act(async () => fireEvent.press(screen.getByTestId('selection-delete')));
    expect(mockRemove.mock.calls.map(([id]) => id)).toEqual(['b']);
    await act(() => mockUndo.end());
  });

  // The grid's cards, in the order shown.
  const gridOrder = () => screen.getAllByTestId(/^grid-/).map((el) => el.props.testID.slice('grid-'.length));
  const select = async (...ids: string[]) => {
    await act(async () => fireEvent(screen.getByTestId(`grid-${ids[0]}`), 'longPress'));
    for (const id of ids.slice(1)) await act(async () => fireEvent.press(screen.getByTestId(`grid-${id}`)));
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
    await act(async () => fireEvent.press(screen.getByTestId('sort-close')));
    expect(screen.queryByTestId('sort-sheet')).toBeNull();
    expect(screen.getByTestId('sort-chip')).toHaveTextContent(strings.home.sortChip(strings.home.sortName));
    expect(screen.getByTestId('sort-chip').props.accessibilityHint).toContain(`${strings.home.expiringSoon}: on`);
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
        expect(screen.getByTestId('sort-chip').props.accessibilityLabel).toBe(strings.home.sortChip(strings.home.sortName));
        expect(screen.queryByTestId('sort-expiry')).toBeNull();
        await act(async () => fireEvent.press(screen.getByTestId('sort-chip')));
        expect(screen.getByTestId('sort-sheet')).toBeTruthy();
        expect(screen.getByRole('radio', { name: strings.home.sortName }).props.accessibilityState).toEqual({ checked: true });
        await act(async () => fireEvent.press(screen.getByTestId('sort-expiry')));
        expect(gridOrder()).toEqual(['b', 'a', 'c']);
        expect(mockSettingsSet).toHaveBeenLastCalledWith('gallerySort', 'expiry');
        expect(screen.getByTestId('sort-chip').props.accessibilityLabel).toBe(strings.home.sortChip(strings.home.sortExpiry));
        await act(async () => fireEvent.press(screen.getByTestId('sort-added')));
        expect(gridOrder()).toEqual(['b', 'c', 'a']);
        await act(async () => fireEvent.press(screen.getByTestId('sort-close')));
        expect(screen.queryByTestId('sort-sheet')).toBeNull();
      },
    );
  });

  test('restores the saved gallery order and Expiring soon filter', async () => {
    mockHomeView = 'gallery';
    mockGallerySort = 'expiry';
    mockGalleryExpiring = 'on';
    await render(<Home />);
    expect(await screen.findByTestId('sort-chip')).toBeTruthy();
    expect(screen.getByTestId('sort-chip').props.accessibilityLabel).toBe(strings.home.sortChip(strings.home.sortExpiry));
    await act(async () => fireEvent.press(screen.getByTestId('sort-chip')));
    expect(screen.getByRole('radio', { name: strings.home.sortExpiry }).props.accessibilityState).toEqual({ checked: true });
    expect(screen.getByRole('checkbox', { name: strings.home.expiringSoon }).props.accessibilityState).toEqual({ checked: true });
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
        await act(async () => fireEvent.press(screen.getByTestId('sort-chip')));
        await act(async () => fireEvent.press(screen.getByTestId('filter-expiring')));
        expect(gridOrder()).toEqual(['gone', 'soon']);
        expect(mockSettingsSet).toHaveBeenLastCalledWith('galleryExpiring', 'on');
        await act(async () => fireEvent.press(screen.getByTestId('filter-expiring')));
        expect(gridOrder()).toHaveLength(4);
      },
    );
  });

  test('says so when nothing is expiring soon', async () => {
    await showGallery();
    await act(async () => fireEvent.press(screen.getByTestId('sort-chip')));
    await act(async () => fireEvent.press(screen.getByTestId('filter-expiring')));
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
  describe('in the gallery', () => {
    const showGallery = async () => {
      await renderHome();
      await act(async () => fireEvent.press(screen.getByTestId('view-gallery')));
    };

    test('the first gallery shows a tip on selecting', async () => {
      mockSeenTips = null;
      await showGallery();
      expect(await screen.findByText(strings.home.galleryTip)).toBeTruthy();
    });

    test('dismissing the gallery tip hides it for good', async () => {
      mockSeenTips = null;
      await showGallery();
      await act(async () => fireEvent.press(await screen.findByRole('button', { name: strings.home.dismissTip })));
      expect(screen.queryByText(strings.home.galleryTip)).toBeNull();
      expect(mockSettingsSet).toHaveBeenCalledWith('seenTips', expect.stringMatching(/(^|,)gallery(,|$)/));
    });

    test('selecting with a long-press hides the gallery tip for good', async () => {
      mockSeenTips = null;
      await showGallery();
      await screen.findByText(strings.home.galleryTip);
      await act(async () => fireEvent(screen.getByTestId('grid-a'), 'longPress'));
      await act(async () => fireEvent.press(screen.getByTestId('selection-cancel')));
      expect(screen.queryByText(strings.home.galleryTip)).toBeNull();
      expect(mockSettingsSet).toHaveBeenCalledWith('seenTips', expect.stringMatching(/(^|,)gallery(,|$)/));
    });

    test('a gallery tip seen before a restart stays hidden', async () => {
      mockSeenTips = 'gallery.read,gallery';
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
    expect(alert).toHaveBeenCalledWith(strings.errors.actions.undo.title, strings.errors.actions.undo.body);
    alert.mockRestore();
    warn.mockRestore();
  });
});


test.each(['list', 'gallery'])('pinned notes show only titles beside pinned documents in %s view', async (view) => {
  mockHomeView = view;
  mockNotes = [
    { id: 'note', title: 'Packing', body: 'PRIVATE NOTE BODY', tags: [], documentId: null, pinned: true, createdAt: 1, updatedAt: 1 },
    { id: 'blank-title', title: ' ', body: 'NEVER USE BODY AS TITLE', tags: [], documentId: null, pinned: true, createdAt: 1, updatedAt: 1 },
    { id: 'unpinned', title: 'Not pinned', body: 'Hidden', tags: [], documentId: null, pinned: false, createdAt: 1, updatedAt: 1 },
  ];
  await withCards([makeCard({ id: 'doc', name: 'Passport', pinned: true })], async () => {
    await render(<Home />);
    expect(within(await screen.findByTestId('pinned-note-note')).getByText('Packing')).toBeTruthy();
    expect(within(screen.getByTestId('pinned-note-blank-title')).getByText(strings.notes.untitled)).toBeTruthy();
    expect(screen.getByTestId('pinned-doc')).toBeTruthy();
    expect(screen.queryByTestId('pinned-note-unpinned')).toBeNull();
    expect(JSON.stringify(screen.toJSON())).not.toContain('PRIVATE NOTE BODY');
    expect(JSON.stringify(screen.toJSON())).not.toContain('NEVER USE BODY AS TITLE');
    await fireEvent.changeText(screen.getByTestId('search'), 'missing');
    await fireEvent.press(screen.getByTestId('pinned-note-note'));
    expect(mockPush).toHaveBeenCalledWith('/note/note');
    mockNotes = [];
    await screen.rerender(<Home />);
    expect(screen.queryByTestId('pinned-note-note')).toBeNull();
  });
});

test('home offers pinned notes even when there are no documents', async () => {
  mockNotes = [{ id: 'n', title: 'My note', body: 'Secret', tags: [], documentId: null, pinned: true, createdAt: 1, updatedAt: 1 }];
  await withCards([], async () => {
    await render(<Home />);
    expect(screen.getByTestId('pinned-note-n')).toBeTruthy();
    expect(screen.queryByTestId('empty-state')).toBeNull();
    await fireEvent.press(screen.getByTestId('pinned-note-n'));
    expect(mockPush).toHaveBeenCalledWith('/note/n');
  });
});

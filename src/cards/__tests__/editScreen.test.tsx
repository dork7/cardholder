import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { frontImage, makeCard } from '../../../test/fixtures';
import EditCard from '../../../app/edit/[id]';
import { Folder } from '../types';
import { strings } from '../../strings';

let mockParams: { id: string } = { id: 'new' };
const mockBack = jest.fn();
const mockDismissAll = jest.fn();
const mockReplace = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockRemove = jest.fn();
const mockCreateFolder = jest.fn();
const mockListFolders = jest.fn();
const mockRefresh = jest.fn();
const mockPermission = jest.fn();
let mockCards: ReturnType<typeof makeCard>[] = [];
let mockFolders: Folder[] = [];

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ back: mockBack, dismissAll: mockDismissAll, replace: mockReplace }),
}));
jest.mock('../../app/AppProvider', () => ({
  useApp: () => ({
    services: {
      store: {
        create: (...a: unknown[]) => mockCreate(...a),
        update: (...a: unknown[]) => mockUpdate(...a),
        remove: (...a: unknown[]) => mockRemove(...a),
        createFolder: (...a: unknown[]) => mockCreateFolder(...a),
        listFolders: () => mockListFolders(),
        loadImage: () => Promise.resolve(null),
      },
    },
    cards: mockCards,
    folders: mockFolders,
    unlocked: false,
    refresh: () => mockRefresh(),
  }),
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../../reminders/scheduler', () => ({
  requestReminderPermissionOnce: () => mockPermission(),
}));
const mockPickPdfPage = jest.fn();
jest.mock('../../images/capture', () => ({
  pickImage: () => Promise.resolve(require('../../../test/fixtures').frontImage('picked')),
  canPickPdf: true,
  pickPdfPage: (...a: unknown[]) => mockPickPdfPage(...a),
  isPdfLocked: (e: { code?: string }) => e.code === 'E_PDF_LOCKED',
}));
const mockAnalyze = jest.fn();
jest.mock('../../analysis/analyze', () => ({ analyzeImage: (...a: unknown[]) => mockAnalyze(...a) }));

let warn: jest.SpyInstance;
let alert: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { id: 'new' };
  mockCards = [];
  mockFolders = [];
  mockCreate.mockResolvedValue(makeCard());
  mockUpdate.mockResolvedValue(makeCard());
  mockRemove.mockResolvedValue(undefined);
  mockCreateFolder.mockImplementation((name: string) => Promise.resolve({ id: 'made', name, createdAt: 1 }));
  mockListFolders.mockImplementation(() => Promise.resolve(mockFolders));
  mockRefresh.mockResolvedValue(undefined);
  mockPermission.mockResolvedValue(true);
  mockAnalyze.mockResolvedValue({});
  mockPickPdfPage.mockResolvedValue(frontImage('pdf'));
  warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => {
  warn.mockRestore();
  alert.mockRestore();
});

async function fillNewCard() {
  await render(<EditCard />);
  await fireEvent.press(screen.getByTestId('front-library'));
  await fireEvent.changeText(screen.getByTestId('card-name'), 'Gym');
}

const save = () => fireEvent.press(screen.getByTestId('save-card'));

describe('saving', () => {
  test('a failed reminder permission after the card was written still leaves the screen, without a second write', async () => {
    mockPermission.mockRejectedValue(new Error('permission boom'));
    await fillNewCard();
    await fireEvent.press(screen.getByRole('button', { name: strings.edit.addExpiry }));
    await save();
    await save();
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalled();
    expect(alert).not.toHaveBeenCalled();
  });

  test('a failed refresh after the card was written still leaves the screen, without a second write', async () => {
    mockRefresh.mockRejectedValue(new Error('refresh boom'));
    await fillNewCard();
    await save();
    await save();
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalled();
    expect(alert).not.toHaveBeenCalled();
  });

  test('a failed edit write shows the error, stays, and allows a retry', async () => {
    mockParams = { id: 'card1' };
    mockCards = [makeCard()];
    mockUpdate.mockRejectedValueOnce(new Error('disk full'));
    await render(<EditCard />);
    await save();
    expect(alert).toHaveBeenCalledWith(strings.common.error);
    expect(mockBack).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
    await save();
    expect(mockUpdate).toHaveBeenCalledTimes(2);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  test('Save stays disabled after a successful write, so it cannot be written twice', async () => {
    await fillNewCard();
    await save();
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('save-card').props.accessibilityState).toMatchObject({ disabled: true });
    await save();
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });
});

describe('adding from a PDF', () => {
  test('the front comes from page 1 and the back from page 2, and both are read', async () => {
    await render(<EditCard />);
    await fireEvent.press(screen.getByTestId('front-pdf'));
    await fireEvent.press(screen.getByTestId('back-pdf'));
    expect(mockPickPdfPage.mock.calls).toEqual([[0], [1]]);
    expect(mockAnalyze).toHaveBeenCalledTimes(2);
    await save();
    expect(mockCreate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ front: frontImage('pdf'), back: frontImage('pdf') }),
    );
  });

  test('a cancelled pick changes nothing', async () => {
    mockPickPdfPage.mockResolvedValue(null);
    await render(<EditCard />);
    await fireEvent.press(screen.getByTestId('front-pdf'));
    await save();
    expect(mockCreate).not.toHaveBeenCalled();
    expect(alert).not.toHaveBeenCalled();
  });

  test('a password-protected PDF says so', async () => {
    mockPickPdfPage.mockRejectedValue(Object.assign(new Error('locked'), { code: 'E_PDF_LOCKED' }));
    await render(<EditCard />);
    await fireEvent.press(screen.getByTestId('front-pdf'));
    expect(alert).toHaveBeenCalledWith(strings.edit.pdfLocked);
  });

  test('any other failure shows the PDF error', async () => {
    mockPickPdfPage.mockRejectedValue(new Error('bad file'));
    await render(<EditCard />);
    await fireEvent.press(screen.getByTestId('front-pdf'));
    expect(alert).toHaveBeenCalledWith(strings.edit.pdfFailed);
  });
});

describe('deleting', () => {
  async function confirmDelete() {
    mockParams = { id: 'card1' };
    mockCards = [makeCard()];
    await render(<EditCard />);
    await fireEvent.press(screen.getByRole('button', { name: strings.edit.deleteCard }));
    const buttons = alert.mock.calls[0][2] as { text: string; onPress?: () => Promise<void> }[];
    const destructive = buttons.find((b) => b.text === strings.common.delete)!;
    alert.mockClear();
    await act(async () => destructive.onPress!());
  }

  test('a failed removal shows the generic error and stays on the screen', async () => {
    mockRemove.mockRejectedValue(new Error('io error'));
    await confirmDelete();
    expect(alert).toHaveBeenCalledWith(strings.common.error);
    expect(mockRefresh).not.toHaveBeenCalled();
    expect(mockDismissAll).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
  });

  test('a failed refresh after a successful removal still closes the screen', async () => {
    mockRefresh.mockRejectedValue(new Error('refresh boom'));
    await confirmDelete();
    expect(mockRemove).toHaveBeenCalledTimes(1);
    expect(mockDismissAll).toHaveBeenCalledTimes(1);
    expect(alert).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
  });
});

test('Close leaves the add-card modal without writing anything', async () => {
  await fillNewCard();
  await fireEvent.press(screen.getByRole('button', { name: strings.common.close }));
  expect(mockBack).toHaveBeenCalled();
  expect(mockCreate).not.toHaveBeenCalled();
});

describe('reading the card from its photo', () => {
  const KEY = 'a'.repeat(64);
  const emiratesId = {
    name: { value: 'Emirates ID', confidence: 0.9 },
    expiresOn: { value: '2030-11-09', confidence: 0.85 },
    category: { value: 'id', confidence: 0.95 },
    tags: { value: ['Government'], confidence: 0.7 },
    documentKey: KEY,
  };

  test('a picked photo fills name, expiry, category and tags, marked as suggested, and they are saved', async () => {
    mockAnalyze.mockResolvedValue({ ...emiratesId, category: { value: 'insurance', confidence: 0.8 } });
    await render(<EditCard />);
    await fireEvent.press(screen.getByTestId('front-library'));
    expect(mockAnalyze).toHaveBeenCalledWith(frontImage('picked').jpegBase64);
    expect(screen.getByTestId('card-name').props.value).toBe('Emirates ID');
    expect(screen.getAllByText(strings.edit.suggested)).toHaveLength(4);
    expect(screen.getByLabelText(strings.edit.removeTag('Government'))).toBeTruthy();
    await save();
    expect(mockCreate).toHaveBeenCalledWith(
      { name: 'Emirates ID', category: 'insurance', expiresOn: '2030-11-09', tags: ['Government'], documentKey: KEY, folderId: null },
      expect.anything(),
    );
  });

  test('what the user typed is never replaced, even when the read finishes later', async () => {
    let finish: (a: unknown) => void = () => {};
    mockAnalyze.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    await render(<EditCard />);
    await fireEvent.press(screen.getByTestId('front-library'));
    expect(screen.getByText(strings.edit.reading)).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('card-name'), 'My ID');
    await act(async () => finish(emiratesId));
    expect(screen.getByTestId('card-name').props.value).toBe('My ID');
    expect(screen.queryByText(strings.edit.reading)).toBeNull();
    expect(screen.getAllByText(strings.edit.suggested)).toHaveLength(3); // expiry, category and tags
  });

  test('editing an existing card keeps its saved name and category', async () => {
    mockCards = [makeCard({ id: 'c1', name: 'Gym', category: 'membership' })];
    mockParams = { id: 'c1' };
    mockAnalyze.mockResolvedValue(emiratesId);
    await render(<EditCard />);
    await fireEvent.press(screen.getByTestId('front-library'));
    expect(screen.getByTestId('card-name').props.value).toBe('Gym');
    await save();
    expect(mockUpdate).toHaveBeenCalledWith(
      'c1',
      { name: 'Gym', category: 'membership', expiresOn: '2030-11-09', tags: ['Government'], documentKey: KEY, folderId: null }, // blanks filled, tags added
      expect.anything(),
    );
  });

  test('a photo that cannot be read leaves the form as it was', async () => {
    mockAnalyze.mockRejectedValue(new Error('vision failed'));
    await render(<EditCard />);
    await fireEvent.press(screen.getByTestId('front-library'));
    expect(screen.getByTestId('card-name').props.value).toBe('');
    expect(screen.queryByText(strings.edit.suggested)).toBeNull();
    expect(alert).not.toHaveBeenCalled();
  });
});

describe('a new card that looks like one already saved', () => {
  const KEY = 'b'.repeat(64);
  beforeEach(() => {
    mockCards = [makeCard({ id: 'old', name: 'Emirates ID', category: 'id', documentKey: KEY, pinned: true, hasBack: true, backAspect: 1.586 })];
    mockAnalyze.mockResolvedValue({ documentKey: KEY });
  });

  // Answers the duplicate prompt with the button labelled `label` as soon as it is shown.
  const answer = (label: string) =>
    alert.mockImplementation((_title, _body, buttons?: { text: string; onPress?: () => void }[]) =>
      buttons?.find((b) => b.text === label)?.onPress?.(),
    );

  test('asks whether to replace it; Replace puts the new photos and details on the old card', async () => {
    answer(strings.edit.replace);
    await fillNewCard();
    await save();
    expect(alert).toHaveBeenCalledWith(strings.edit.duplicateTitle('Emirates ID'), strings.edit.duplicateBody, expect.any(Array), expect.anything());
    expect(mockUpdate).toHaveBeenCalledWith(
      'old',
      expect.objectContaining({ name: 'Gym', documentKey: KEY }),
      { front: frontImage('picked'), back: null }, // the old back belonged to the old card
    );
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockBack).toHaveBeenCalled();
  });

  test('a replaced card stays in its folder unless one was picked for the new card', async () => {
    mockCards = [makeCard({ id: 'old', name: 'Emirates ID', category: 'id', documentKey: KEY, folderId: 'fam' })];
    answer(strings.edit.replace);
    await fillNewCard();
    await save();
    expect(mockUpdate).toHaveBeenCalledWith('old', expect.objectContaining({ folderId: 'fam' }), expect.anything());
  });

  test('Keep both adds it as a new card', async () => {
    answer(strings.edit.keepBoth);
    await fillNewCard();
    await save();
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  test('Cancel saves nothing and leaves the form open for another try', async () => {
    answer(strings.common.cancel);
    await fillNewCard();
    await save();
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockBack).not.toHaveBeenCalled();
    alert.mockClear();
    await save();
    expect(alert).toHaveBeenCalledTimes(1);
  });

  test('editing an existing card never asks', async () => {
    mockParams = { id: 'old' };
    await render(<EditCard />);
    await save();
    expect(alert).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });
});

describe('folders', () => {
  const daman = {
    name: { value: 'Daman', confidence: 0.8 },
    category: { value: 'insurance', confidence: 0.8 },
    text: 'DAMAN\nHealth Insurance',
  };

  test('a card that fits a folder is put in it, marked as suggested, and saved there', async () => {
    mockFolders = [
      { id: 'fam', name: 'Family', createdAt: 1 },
      { id: 'ins', name: 'Insurance', createdAt: 1 },
    ];
    mockAnalyze.mockResolvedValue(daman);
    await render(<EditCard />);
    await fireEvent.press(screen.getByTestId('front-library'));
    expect(screen.getByTestId('folder-ins').props.accessibilityState).toEqual({ checked: true });
    expect(screen.getAllByText(strings.edit.suggested)).toHaveLength(3); // name, category, folder
    await save();
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ folderId: 'ins' }), expect.anything());
    expect(mockCreateFolder).not.toHaveBeenCalled();
  });

  test('when no folder fits, a new one is offered and only made when the card is saved', async () => {
    mockFolders = [{ id: 'fam', name: 'Family', createdAt: 1 }];
    mockAnalyze.mockResolvedValue(daman);
    await render(<EditCard />);
    await fireEvent.press(screen.getByTestId('front-library'));
    expect(screen.getByText(strings.folders.suggestNewBody('Insurance'))).toBeTruthy();
    await fireEvent.press(screen.getByTestId('accept-folder-offer'));
    expect(screen.queryByTestId('folder-offer')).toBeNull();
    expect(screen.getByText(strings.folders.pendingNew('Insurance'))).toBeTruthy();
    expect(mockCreateFolder).not.toHaveBeenCalled();
    await save();
    expect(mockCreateFolder).toHaveBeenCalledWith('Insurance');
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ folderId: 'made' }), expect.anything());
  });

  test('an offer that is not taken leaves the card outside any folder', async () => {
    mockAnalyze.mockResolvedValue(daman);
    await render(<EditCard />);
    await fireEvent.press(screen.getByTestId('front-library'));
    expect(screen.getByTestId('folder-offer')).toBeTruthy();
    await save();
    expect(mockCreateFolder).not.toHaveBeenCalled();
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ folderId: null }), expect.anything());
  });

  test('the folder the user picked is kept over a suggestion', async () => {
    mockFolders = [
      { id: 'fam', name: 'Family', createdAt: 1 },
      { id: 'ins', name: 'Insurance', createdAt: 1 },
    ];
    let finish: (a: unknown) => void = () => {};
    mockAnalyze.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    await render(<EditCard />);
    await fireEvent.press(screen.getByTestId('front-library'));
    await fireEvent.press(screen.getByTestId('folder-fam'));
    await act(async () => finish(daman));
    expect(screen.getByTestId('folder-fam').props.accessibilityState).toEqual({ checked: true });
    await save();
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ folderId: 'fam' }), expect.anything());
  });

  test('a folder typed in the form is made on save, and a duplicate name is refused', async () => {
    mockFolders = [{ id: 'fam', name: 'Family', createdAt: 1 }];
    await fillNewCard();
    await fireEvent.press(screen.getByTestId('folder-add'));
    await fireEvent.changeText(screen.getByTestId('new-folder-name'), 'family');
    await fireEvent.press(screen.getByTestId('new-folder-submit'));
    expect(screen.getByText(strings.folders.errors.duplicate)).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('new-folder-name'), 'Work');
    await fireEvent.press(screen.getByTestId('new-folder-submit'));
    await save();
    expect(mockCreateFolder).toHaveBeenCalledWith('Work');
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ folderId: 'made' }), expect.anything());
  });
});

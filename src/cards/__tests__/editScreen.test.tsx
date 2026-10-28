import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { frontImage, makeCard } from '../../../test/fixtures';
import EditCard from '../../../app/edit/[id]';
import { gemmaReader } from '../../analysis/gemma';
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
const mockAddCategory = jest.fn((_c: string) => Promise.resolve());
let mockCategories: string[] = ['id', 'insurance', 'membership', 'other'];
let mockCards: ReturnType<typeof makeCard>[] = [];
let mockFolders: Folder[] = [];

// Folders are hidden in the app for now (FOLDERS_ENABLED); these tests cover both ways.
let mockFoldersEnabled = true;
jest.mock('../../config', () =>
  Object.defineProperty({ ...jest.requireActual('../../config') }, 'FOLDERS_ENABLED', {
    get: () => mockFoldersEnabled,
  }),
);
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ back: mockBack, dismissAll: mockDismissAll, replace: mockReplace }),
}));
// Stable like the real provider's memoised value; a fresh object per render would reload the PDF forever.
const mockServices = {
  store: {
    create: (...a: unknown[]) => mockCreate(...a),
    update: (...a: unknown[]) => mockUpdate(...a),
    remove: (...a: unknown[]) => mockRemove(...a),
    createFolder: (...a: unknown[]) => mockCreateFolder(...a),
    listFolders: () => mockListFolders(),
    loadImage: () => Promise.resolve(null),
    loadPdf: (id: string) => Promise.resolve(`${id}-pdf`),
    addCategory: (c: string) => mockAddCategory(c),
  },
};
jest.mock('../../app/AppProvider', () => ({
  useApp: () => ({
    services: mockServices,
    cards: mockCards,
    folders: mockFolders,
    categories: mockCategories,
    unlocked: false,
    refresh: () => mockRefresh(),
  }),
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../../reminders/scheduler', () => ({
  requestReminderPermissionOnce: () => mockPermission(),
}));
jest.mock('../../images/capture', () => ({
  pickImage: () => Promise.resolve(require('../../../test/fixtures').frontImage('picked')),
}));
const mockPickPdf = jest.fn();
const mockRenderCover = jest.fn();
jest.mock('../../images/pdf', () => {
  class PdfTooLargeError extends Error {}
  return {
    canPickPdf: true,
    pickPdf: () => mockPickPdf(),
    renderCover: (...a: unknown[]) => mockRenderCover(...a),
    renderPages: () => Promise.resolve(),
    isPdfLocked: (e: { code?: string }) => e.code === 'E_PDF_LOCKED',
    PdfTooLargeError,
  };
});
const mockAnalyze = jest.fn();
jest.mock('../../analysis/analyze', () => ({ analyzeImage: (...a: unknown[]) => mockAnalyze(...a) }));

let warn: jest.SpyInstance;
let alert: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  mockFoldersEnabled = true;
  mockParams = { id: 'new' };
  mockCards = [];
  mockFolders = [];
  mockCategories = ['id', 'insurance', 'membership', 'other'];
  mockCreate.mockResolvedValue(makeCard());
  mockUpdate.mockResolvedValue(makeCard());
  mockRemove.mockResolvedValue(undefined);
  mockCreateFolder.mockImplementation((name: string) => Promise.resolve({ id: 'made', name, createdAt: 1 }));
  mockListFolders.mockImplementation(() => Promise.resolve(mockFolders));
  mockRefresh.mockResolvedValue(undefined);
  mockPermission.mockResolvedValue(true);
  mockAnalyze.mockResolvedValue({});
  mockPickPdf.mockResolvedValue(pdfDoc());
  mockRenderCover.mockImplementation((pdf: { coverPage: number }) => Promise.resolve(frontImage(`page${pdf.coverPage}`)));
  warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => {
  warn.mockRestore();
  alert.mockRestore();
});

const pdfDoc = (coverPage = 0) => ({ pdfBase64: 'JVBERi0x', pageCount: 3, coverPage });

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
  test('keeps the whole PDF, shows its first page as the thumbnail, and reads that page', async () => {
    await render(<EditCard />);
    await fireEvent.press(screen.getByTestId('front-pdf'));
    expect(mockRenderCover).toHaveBeenCalledWith(pdfDoc(0));
    expect(mockAnalyze).toHaveBeenCalledWith(frontImage('page0').jpegBase64, { smart: gemmaReader });
    // The PDF's pages take the place of a back photo.
    expect(screen.queryByTestId('back-library')).toBeNull();
    expect(screen.getByTestId('pdf-page-0').props.accessibilityState).toMatchObject({ selected: true });
    await save();
    expect(mockCreate).toHaveBeenCalledWith(expect.anything(), { front: frontImage('page0'), back: null, pdf: pdfDoc(0) });
  });

  test('choosing another page makes it the thumbnail', async () => {
    await render(<EditCard />);
    await fireEvent.press(screen.getByTestId('front-pdf'));
    await fireEvent.press(screen.getByTestId('pdf-page-2'));
    expect(mockRenderCover).toHaveBeenLastCalledWith(pdfDoc(2));
    expect(screen.getByTestId('pdf-page-2').props.accessibilityState).toMatchObject({ selected: true });
    await save();
    expect(mockCreate).toHaveBeenCalledWith(expect.anything(), { front: frontImage('page2'), back: null, pdf: pdfDoc(2) });
  });

  test('a photo of the front replaces the PDF', async () => {
    await render(<EditCard />);
    await fireEvent.press(screen.getByTestId('front-pdf'));
    await fireEvent.press(screen.getByTestId('front-library'));
    expect(screen.queryByTestId('pdf-pages')).toBeNull();
    expect(screen.getByTestId('back-library')).toBeTruthy();
    await save();
    expect(mockCreate).toHaveBeenCalledWith(expect.anything(), { front: frontImage('picked'), back: null });
  });

  test("on a saved PDF card, a new thumbnail page is drawn from the stored PDF", async () => {
    mockParams = { id: 'card1' };
    mockCards = [makeCard({ pdf: { pageCount: 3, coverPage: 0 } })];
    await render(<EditCard />);
    await fireEvent.press(screen.getByTestId('pdf-page-1'));
    const stored = { pdfBase64: 'card1-pdf', pageCount: 3, coverPage: 1 };
    expect(mockRenderCover).toHaveBeenCalledWith(stored);
    await save();
    expect(mockUpdate).toHaveBeenCalledWith('card1', expect.anything(), { front: frontImage('page1'), pdf: stored });
  });

  test('a PDF on a card with a back photo removes the back', async () => {
    mockParams = { id: 'card1' };
    mockCards = [makeCard({ hasBack: true, backAspect: 1.586 })];
    await render(<EditCard />);
    await fireEvent.press(screen.getByTestId('front-pdf'));
    await save();
    expect(mockUpdate).toHaveBeenCalledWith('card1', expect.anything(), { front: frontImage('page0'), back: null, pdf: pdfDoc(0) });
  });

  test('a photo replacing a saved PDF removes it', async () => {
    mockParams = { id: 'card1' };
    mockCards = [makeCard({ pdf: { pageCount: 3, coverPage: 0 } })];
    await render(<EditCard />);
    await fireEvent.press(screen.getByTestId('front-library'));
    await save();
    expect(mockUpdate).toHaveBeenCalledWith('card1', expect.anything(), { front: frontImage('picked'), pdf: null });
  });

  test('a cancelled pick changes nothing', async () => {
    mockPickPdf.mockResolvedValue(null);
    await render(<EditCard />);
    await fireEvent.press(screen.getByTestId('front-pdf'));
    await save();
    expect(mockCreate).not.toHaveBeenCalled();
    expect(alert).not.toHaveBeenCalled();
  });

  test('a password-protected PDF says so', async () => {
    mockPickPdf.mockRejectedValue(Object.assign(new Error('locked'), { code: 'E_PDF_LOCKED' }));
    await render(<EditCard />);
    await fireEvent.press(screen.getByTestId('front-pdf'));
    expect(alert).toHaveBeenCalledWith(strings.edit.pdfLocked);
  });

  test('a PDF over the size limit says so', async () => {
    const { PdfTooLargeError } = jest.requireMock('../../images/pdf');
    mockPickPdf.mockRejectedValue(new PdfTooLargeError());
    await render(<EditCard />);
    await fireEvent.press(screen.getByTestId('front-pdf'));
    expect(alert).toHaveBeenCalledWith(strings.edit.pdfTooLarge(10));
  });

  test('any other failure shows the PDF error', async () => {
    mockPickPdf.mockRejectedValue(new Error('bad file'));
    await render(<EditCard />);
    await fireEvent.press(screen.getByTestId('front-pdf'));
    expect(alert).toHaveBeenCalledWith(strings.edit.pdfFailed);
  });
});

describe('a category that is not in the list', () => {
  test('typing it adds it as a new category, saved with the card', async () => {
    await fillNewCard();
    await fireEvent.press(screen.getByTestId('category-add'));
    await fireEvent.changeText(screen.getByTestId('new-category-name'), ' vehicle ');
    await fireEvent.press(screen.getByTestId('new-category-submit'));
    expect(screen.getByRole('radio', { name: 'Vehicle' }).props.accessibilityState).toMatchObject({ checked: true });
    await save();
    expect(mockAddCategory).toHaveBeenCalledWith('Vehicle');
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ category: 'Vehicle' }), expect.anything());
  });

  test('typing one that exists picks it instead of making a copy', async () => {
    mockCategories = ['id', 'insurance', 'membership', 'other', 'Vehicle'];
    await fillNewCard();
    await fireEvent.press(screen.getByTestId('category-add'));
    await fireEvent.changeText(screen.getByTestId('new-category-name'), 'INSURANCE');
    await fireEvent.press(screen.getByTestId('new-category-submit'));
    await save();
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ category: 'insurance' }), expect.anything());
  });

  test('a blank name says so and adds nothing', async () => {
    await fillNewCard();
    await fireEvent.press(screen.getByTestId('category-add'));
    await fireEvent.press(screen.getByTestId('new-category-submit'));
    expect(screen.getByText(strings.edit.categoryNameError)).toBeTruthy();
  });

  test('a new card starts in the first category offered, as built-ins can be deleted', async () => {
    mockCategories = ['Vehicle', 'other'];
    await fillNewCard();
    await save();
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ category: 'Vehicle' }), expect.anything());
  });

  test('a deleted category is not suggested back from the photo', async () => {
    mockCategories = ['id', 'other'];
    mockAnalyze.mockResolvedValue({ category: { value: 'insurance', confidence: 0.9 } });
    await fillNewCard();
    await save();
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ category: 'id' }), expect.anything());
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
    documentKey: KEY,
  };

  test('a picked photo fills name, expiry and category, marked as suggested, and they are saved', async () => {
    mockAnalyze.mockResolvedValue({ ...emiratesId, category: { value: 'insurance', confidence: 0.8 } });
    await render(<EditCard />);
    await fireEvent.press(screen.getByTestId('front-library'));
    // With the AI model's reader, which suggests nothing until the user has downloaded the model.
    expect(mockAnalyze).toHaveBeenCalledWith(frontImage('picked').jpegBase64, { smart: gemmaReader });
    expect(screen.getByTestId('card-name').props.value).toBe('Emirates ID');
    expect(screen.getAllByText(strings.edit.suggested)).toHaveLength(3);
    await save();
    expect(mockCreate).toHaveBeenCalledWith(
      { name: 'Emirates ID', category: 'insurance', expiresOn: '2030-11-09', tags: [], documentKey: KEY, folderId: null },
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
    expect(screen.getAllByText(strings.edit.suggested)).toHaveLength(2); // expiry and category
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
      { name: 'Gym', category: 'membership', expiresOn: '2030-11-09', tags: [], documentKey: KEY, folderId: null }, // blanks filled
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
      { front: frontImage('picked'), back: null, pdf: null }, // the old back (or PDF) belonged to the old card
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

  test('with folders hidden there is no folder picker, and a card that fits one is not put in it', async () => {
    mockFoldersEnabled = false;
    mockFolders = [{ id: 'ins', name: 'Insurance', createdAt: 1 }];
    mockAnalyze.mockResolvedValue(daman);
    await render(<EditCard />);
    await fireEvent.press(screen.getByTestId('front-library'));
    expect(screen.queryByTestId('folder-ins')).toBeNull();
    expect(screen.queryByTestId('folder-offer')).toBeNull();
    await save();
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ folderId: null }), expect.anything());
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

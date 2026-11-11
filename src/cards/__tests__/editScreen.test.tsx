import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { frontImage, image, makeCard } from '../../../test/fixtures';
import EditCard from '../../../app/edit/[id]';
import { localReader } from '../../analysis/localModel';
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

// Folders are hidden in the app for now (FOLDERS_ENABLED); these tests cover both ways.
let mockFoldersEnabled = true;
jest.mock('../../config', () =>
  Object.defineProperty({ ...jest.requireActual('../../config') }, 'FOLDERS_ENABLED', {
    get: () => mockFoldersEnabled,
  }),
);
// The navigator's removal guard: what the screen last asked for, and what it does when leaving is blocked.
const mockGuard: { on: boolean; onPrevented?: (o: { data: { action: object }; repeat: () => void }) => void } = { on: false };
const mockDisablePrevention = jest.fn();
const mockRepeat = jest.fn();
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ back: mockBack, dismissAll: mockDismissAll, replace: mockReplace }),
  usePreventRemove: (on: boolean, onPrevented: typeof mockGuard.onPrevented) => {
    mockGuard.on = on;
    mockGuard.onPrevented = onPrevented;
    return mockDisablePrevention;
  },
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
  },
};
jest.mock('../../app/AppProvider', () => ({
  useApp: () => ({
    services: mockServices,
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
// Picking a photo gives the cropped image, plus the whole photo when the crop started cut around the card.
const mockPickImage = jest.fn(() =>
  Promise.resolve({ image: require('../../../test/fixtures').frontImage('picked'), original: null as string | null }),
);
const mockCropFullPhoto = jest.fn();
const mockDiscard = jest.fn();
const mockClearOriginals = jest.fn();
jest.mock('../../images/capture', () => ({
  pickImage: () => mockPickImage(),
  cropFullPhoto: (path: string) => mockCropFullPhoto(path),
  discardFile: (path: string) => mockDiscard(path),
  clearOriginals: () => mockClearOriginals(),
}));
const mockPickPdf = jest.fn();
const mockRenderCover = jest.fn();
const mockRenderPdfPage = jest.fn();
jest.mock('../../images/pdf', () => {
  class PdfTooLargeError extends Error {}
  return {
    canPickPdf: true,
    pickPdf: () => mockPickPdf(),
    renderCover: (...a: unknown[]) => mockRenderCover(...a),
    renderPdfPage: (...a: unknown[]) => mockRenderPdfPage(...a),
    PDF_BACK_PAGE: 1,
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
  mockRenderPdfPage.mockImplementation((_pdf: unknown, page: number) => Promise.resolve(image(`back${page}`)));
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

// Close, or the back gesture: the navigator blocks it while the guard is on and hands it to the screen.
async function tryToLeave() {
  await fireEvent.press(screen.getByTestId('close-edit'));
  if (mockGuard.on) await act(async () => mockGuard.onPrevented?.({ data: { action: { type: 'GO_BACK' } }, repeat: mockRepeat }));
}
const discardButtons = () => alert.mock.calls.find(([title]) => title === strings.edit.discardTitle)?.[2] as {
  text: string;
  onPress?: () => void;
}[];

describe('leaving with unsaved changes', () => {
  test('an untouched new card closes without asking', async () => {
    await render(<EditCard />);
    await tryToLeave();
    expect(mockGuard.on).toBe(false);
    expect(alert).not.toHaveBeenCalled();
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  test('an unchanged saved card closes without asking', async () => {
    mockParams = { id: 'card1' };
    mockCards = [makeCard()];
    await render(<EditCard />);
    await tryToLeave();
    expect(mockGuard.on).toBe(false);
    expect(alert).not.toHaveBeenCalled();
  });

  test('with a photo and a name, leaving asks; Keep editing stays and Discard leaves', async () => {
    await fillNewCard();
    await tryToLeave();
    expect(mockGuard.on).toBe(true);
    const buttons = discardButtons();
    expect(buttons.map((b) => b.text)).toEqual([strings.edit.keepEditing, strings.edit.discard]);
    expect(mockRepeat).not.toHaveBeenCalled();
    await act(async () => buttons[1].onPress?.());
    expect(mockRepeat).toHaveBeenCalledTimes(1);
    expect(mockGuard.on).toBe(false);
  });

  test('changing one field of a saved card is enough to ask', async () => {
    mockParams = { id: 'card1' };
    mockCards = [makeCard({ name: 'Gym' })];
    await render(<EditCard />);
    await fireEvent.changeText(screen.getByTestId('card-name'), 'Gym pass');
    expect(mockGuard.on).toBe(true);
    await fireEvent.changeText(screen.getByTestId('card-name'), 'Gym');
    expect(mockGuard.on).toBe(false);
  });

  test('saving leaves without asking', async () => {
    await fillNewCard();
    await save();
    expect(mockDisablePrevention).toHaveBeenCalled();
    expect(mockGuard.on).toBe(false);
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(discardButtons()).toBeUndefined();
  });

  test('deleting leaves without asking', async () => {
    mockParams = { id: 'card1' };
    mockCards = [makeCard({ name: 'Gym' })];
    await render(<EditCard />);
    await fireEvent.changeText(screen.getByTestId('card-name'), 'Gym pass');
    await fireEvent.press(screen.getByRole('button', { name: strings.edit.deleteCard }));
    const confirm = alert.mock.calls.find(([title]) => title === strings.edit.deleteConfirmTitle)?.[2];
    await act(async () => confirm[1].onPress());
    expect(mockDisablePrevention).toHaveBeenCalled();
    expect(mockDismissAll).toHaveBeenCalledTimes(1);
  });
});

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

test('the back photo is offered only once there is a front', async () => {
  await render(<EditCard />);
  expect(screen.queryByTestId('back-library')).toBeNull();
  await fireEvent.press(screen.getByTestId('front-library'));
  expect(screen.getByTestId('back-library')).toBeTruthy();
});

describe('adding from a PDF', () => {
  test('keeps the whole PDF, shows its first page as the thumbnail and its second as the back, and reads both', async () => {
    await render(<EditCard />);
    await fireEvent.press(screen.getByTestId('front-pdf'));
    expect(mockRenderCover).toHaveBeenCalledWith(pdfDoc(0));
    expect(mockRenderPdfPage).toHaveBeenCalledWith(pdfDoc(0), 1);
    expect(mockAnalyze).toHaveBeenCalledWith(frontImage('page0').jpegBase64, { smart: localReader });
    expect(mockAnalyze).toHaveBeenCalledWith(image('back1').jpegBase64, { smart: localReader });
    expect(screen.getByTestId('back-remove')).toBeTruthy();
    expect(screen.getByTestId('pdf-page-0').props.accessibilityState).toMatchObject({ selected: true });
    await save();
    expect(mockCreate).toHaveBeenCalledWith(expect.anything(), { front: frontImage('page0'), back: image('back1'), pdf: pdfDoc(0) });
  });

  test('the cross over the back removes it', async () => {
    await render(<EditCard />);
    await fireEvent.press(screen.getByTestId('front-pdf'));
    await fireEvent.press(screen.getByTestId('back-remove'));
    expect(screen.queryByTestId('back-remove')).toBeNull();
    await save();
    expect(mockCreate).toHaveBeenLastCalledWith(expect.anything(), { front: frontImage('page0'), back: null, pdf: pdfDoc(0) });
  });

  test('putting the second page back after removing it', async () => {
    await render(<EditCard />);
    await fireEvent.press(screen.getByTestId('front-pdf'));
    await fireEvent.press(screen.getByTestId('back-remove'));
    await fireEvent.press(screen.getByTestId('pdf-back-page'));
    expect(screen.getByTestId('back-remove')).toBeTruthy();
    await save();
    expect(mockCreate).toHaveBeenCalledWith(expect.anything(), { front: frontImage('page0'), back: image('back1'), pdf: pdfDoc(0) });
  });

  test('a one-page PDF has no back', async () => {
    mockPickPdf.mockResolvedValue({ ...pdfDoc(0), pageCount: 1 });
    await render(<EditCard />);
    await fireEvent.press(screen.getByTestId('front-pdf'));
    expect(mockRenderPdfPage).not.toHaveBeenCalled();
    expect(screen.queryByTestId('back-remove')).toBeNull();
    expect(screen.queryByTestId('pdf-back-page')).toBeNull();
    await save();
    expect(mockCreate).toHaveBeenCalledWith(expect.anything(), { front: frontImage('page0'), back: null, pdf: { ...pdfDoc(0), pageCount: 1 } });
  });

  test('choosing another page makes it the thumbnail', async () => {
    await render(<EditCard />);
    await fireEvent.press(screen.getByTestId('front-pdf'));
    await fireEvent.press(screen.getByTestId('pdf-page-2'));
    expect(mockRenderCover).toHaveBeenLastCalledWith(pdfDoc(2));
    expect(screen.getByTestId('pdf-page-2').props.accessibilityState).toMatchObject({ selected: true });
    await save();
    expect(mockCreate).toHaveBeenCalledWith(expect.anything(), { front: frontImage('page2'), back: image('back1'), pdf: pdfDoc(2) });
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

  test("a PDF on a card with a back photo puts the PDF's second page in its place", async () => {
    mockParams = { id: 'card1' };
    mockCards = [makeCard({ hasBack: true, backAspect: 1.586 })];
    await render(<EditCard />);
    await fireEvent.press(screen.getByTestId('front-pdf'));
    await save();
    expect(mockUpdate).toHaveBeenCalledWith('card1', expect.anything(), { front: frontImage('page0'), back: image('back1'), pdf: pdfDoc(0) });
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

describe("the card's tags", () => {
  const chip = (tag: string) => screen.getByTestId(`tag-chip-${tag}`);
  const isOn = (tag: string) => chip(tag).props.accessibilityState.checked;

  test('a new card starts with none; the starters and the tags in use are offered, and any number can be picked', async () => {
    mockCards = [makeCard({ id: 'c1', name: 'Mulkiya', tags: ['Vehicle'] })];
    await fillNewCard();
    expect(['Vehicle', 'ID', 'Insurance', 'Membership'].map(isOn)).toEqual([false, false, false, false]);
    await fireEvent.press(chip('Vehicle'));
    await fireEvent.press(chip('Insurance'));
    await fireEvent.press(chip('ID'));
    await fireEvent.press(chip('ID')); // off again
    expect(['Vehicle', 'ID', 'Insurance'].map(isOn)).toEqual([true, false, true]);
    await save();
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ tags: ['Vehicle', 'Insurance'] }), expect.anything());
  });

  test('a card can be saved with no tags', async () => {
    await fillNewCard();
    await save();
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ tags: [] }), expect.anything());
  });

  test('typing a new one adds it to the card, switched on', async () => {
    await fillNewCard();
    await fireEvent.press(screen.getByTestId('tag-add'));
    await fireEvent.changeText(screen.getByTestId('new-tag-name'), ' Boat  papers ');
    await fireEvent.press(screen.getByTestId('new-tag-submit'));
    expect(isOn('Boat papers')).toBe(true);
    await save();
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ tags: ['Boat papers'] }), expect.anything());
  });

  test('typing one that exists picks it instead of making a copy', async () => {
    mockCards = [makeCard({ id: 'c1', name: 'Mulkiya', tags: ['Vehicle'] })];
    await fillNewCard();
    await fireEvent.press(screen.getByTestId('tag-add'));
    await fireEvent.changeText(screen.getByTestId('new-tag-name'), 'VEHICLE');
    await fireEvent.press(screen.getByTestId('new-tag-submit'));
    await fireEvent.press(screen.getByTestId('tag-add'));
    await fireEvent.changeText(screen.getByTestId('new-tag-name'), 'insurance');
    await fireEvent.press(screen.getByTestId('new-tag-submit'));
    await save();
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ tags: ['Vehicle', 'Insurance'] }), expect.anything());
  });

  test('a blank name says so and adds nothing', async () => {
    await fillNewCard();
    await fireEvent.press(screen.getByTestId('tag-add'));
    await fireEvent.press(screen.getByTestId('new-tag-submit'));
    expect(screen.getByText(strings.edit.tagNameError)).toBeTruthy();
  });

  test("an existing card's tags are switched on and can be taken off", async () => {
    mockCards = [makeCard({ id: 'c1', name: 'Gym', tags: ['Membership', 'Family'] })];
    mockParams = { id: 'c1' };
    await render(<EditCard />);
    expect([isOn('Membership'), isOn('Family'), isOn('ID')]).toEqual([true, true, false]);
    await fireEvent.press(chip('Family'));
    await save();
    expect(mockUpdate).toHaveBeenCalledWith('c1', expect.objectContaining({ tags: ['Membership'] }), expect.anything());
  });

  test('more tags than a card can have is refused on save', async () => {
    await fillNewCard();
    for (let i = 0; i < 9; i++) {
      await fireEvent.press(screen.getByTestId('tag-add'));
      await fireEvent.changeText(screen.getByTestId('new-tag-name'), `tag ${i}`);
      await fireEvent.press(screen.getByTestId('new-tag-submit'));
    }
    await save();
    expect(screen.getByText(strings.edit.errors['bad-tags'])).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  test('the photo suggests a tag: the kind of document, spelled as a tag already in use', async () => {
    mockCards = [makeCard({ id: 'c1', name: 'Daman', tags: ['insurance'] })];
    mockAnalyze.mockResolvedValue({ category: { value: 'insurance', confidence: 0.9 } });
    await fillNewCard();
    expect(isOn('insurance')).toBe(true);
    await save();
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ tags: ['insurance'] }), expect.anything());
  });

  test('a photo read as Other suggests no tag', async () => {
    mockAnalyze.mockResolvedValue({ category: { value: 'other', confidence: 0.9 } });
    await fillNewCard();
    await save();
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ tags: [] }), expect.anything());
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

  test('a picked photo fills name, expiry and tag, marked as suggested, and they are saved', async () => {
    mockAnalyze.mockResolvedValue({ ...emiratesId, category: { value: 'insurance', confidence: 0.8 }, text: 'UNITED ARAB EMIRATES' });
    await render(<EditCard />);
    await fireEvent.press(screen.getByTestId('front-library'));
    // With the AI model's reader, which suggests nothing until the user has downloaded the model.
    expect(mockAnalyze).toHaveBeenCalledWith(frontImage('picked').jpegBase64, { smart: localReader });
    expect(screen.getByTestId('card-name').props.value).toBe('Emirates ID');
    expect(screen.getAllByText(strings.edit.suggested)).toHaveLength(3);
    await save();
    expect(mockCreate).toHaveBeenCalledWith(
      { name: 'Emirates ID', expiresOn: '2030-11-09', remindDaysBefore: 14, tags: ['Insurance'], documentKey: KEY, folderId: null, readText: { front: 'UNITED ARAB EMIRATES', back: '' }, vertical: false },
      expect.anything(),
    );
  });

  test('keeps the text read off each side for search, and forgets a side whose photo is removed', async () => {
    mockAnalyze.mockResolvedValueOnce({ text: 'FRONT TEXT' }).mockResolvedValueOnce({ text: 'BACK TEXT' });
    await render(<EditCard />);
    await fireEvent.press(screen.getByTestId('front-library'));
    await fireEvent.press(screen.getByTestId('back-library'));
    await save();
    expect(mockCreate.mock.calls.at(-1)?.[0].readText).toEqual({ front: 'FRONT TEXT', back: 'BACK TEXT' });
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
    expect(screen.getAllByText(strings.edit.suggested)).toHaveLength(2); // expiry and tag
  });

  test('editing an existing card keeps its saved name and tags', async () => {
    mockCards = [makeCard({ id: 'c1', name: 'Gym', tags: ['Membership'] })];
    mockParams = { id: 'c1' };
    mockAnalyze.mockResolvedValue(emiratesId);
    await render(<EditCard />);
    await fireEvent.press(screen.getByTestId('front-library'));
    expect(screen.getByTestId('card-name').props.value).toBe('Gym');
    await save();
    expect(mockUpdate).toHaveBeenCalledWith(
      'c1',
      { name: 'Gym', expiresOn: '2030-11-09', remindDaysBefore: 14, tags: ['Membership'], documentKey: KEY, folderId: null, readText: { front: '', back: '' }, vertical: false }, // blanks filled; the new front was read, and this card has no back
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

describe('going back to the whole photo', () => {
  const cutAround = (original: string) =>
    mockPickImage.mockResolvedValueOnce({ image: frontImage('picked'), original });

  test('not offered when the crop already started from the whole photo', async () => {
    await render(<EditCard />);
    await fireEvent.press(screen.getByTestId('front-library'));
    expect(screen.queryByTestId('front-full-photo')).toBeNull();
  });

  test('crops again from the whole photo, reads it, and the option goes', async () => {
    cutAround('file:///cache/originals/1.jpg');
    mockCropFullPhoto.mockResolvedValueOnce(frontImage('whole'));
    await render(<EditCard />);
    await fireEvent.press(screen.getByTestId('front-library'));
    await fireEvent.press(screen.getByTestId('front-full-photo'));

    expect(mockCropFullPhoto).toHaveBeenCalledWith('file:///cache/originals/1.jpg');
    expect(mockAnalyze).toHaveBeenLastCalledWith(frontImage('whole').jpegBase64, expect.anything());
    expect(screen.queryByTestId('front-full-photo')).toBeNull();
    expect(mockDiscard).toHaveBeenCalledWith('file:///cache/originals/1.jpg');
  });

  test('cancelling that crop keeps the photo and the option', async () => {
    cutAround('file:///cache/originals/1.jpg');
    mockCropFullPhoto.mockResolvedValueOnce(null);
    await render(<EditCard />);
    await fireEvent.press(screen.getByTestId('front-library'));
    mockAnalyze.mockClear();
    await fireEvent.press(screen.getByTestId('front-full-photo'));
    expect(mockAnalyze).not.toHaveBeenCalled();
    expect(screen.getByTestId('front-full-photo')).toBeTruthy();
    expect(mockDiscard).not.toHaveBeenCalled();
  });

  test('each side keeps its own; a new photo or removing the back lets the old one go', async () => {
    cutAround('file:///cache/originals/front.jpg');
    cutAround('file:///cache/originals/back.jpg');
    await render(<EditCard />);
    await fireEvent.press(screen.getByTestId('front-library'));
    await fireEvent.press(screen.getByTestId('back-library'));
    expect(screen.getByTestId('front-full-photo')).toBeTruthy();
    expect(screen.getByTestId('back-full-photo')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('front-library')); // a photo that started whole
    expect(mockDiscard).toHaveBeenCalledWith('file:///cache/originals/front.jpg');
    expect(screen.queryByTestId('front-full-photo')).toBeNull();

    await fireEvent.press(screen.getByTestId('back-remove'));
    expect(mockDiscard).toHaveBeenCalledWith('file:///cache/originals/back.jpg');
    expect(screen.queryByTestId('back-full-photo')).toBeNull();
  });

  test('whole photos are cleared when the form opens and when it closes', async () => {
    await render(<EditCard />);
    expect(mockClearOriginals).toHaveBeenCalledTimes(1);
    await screen.unmount();
    expect(mockClearOriginals).toHaveBeenCalledTimes(2);
  });
});

describe('a new card that looks like one already saved', () => {
  const KEY = 'b'.repeat(64);
  beforeEach(() => {
    mockCards = [makeCard({ id: 'old', name: 'Emirates ID', tags: ['ID'], documentKey: KEY, pinned: true, hasBack: true, backAspect: 1.586 })];
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
    mockCards = [makeCard({ id: 'old', name: 'Emirates ID', tags: ['ID'], documentKey: KEY, folderId: 'fam' })];
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
    expect(screen.getAllByText(strings.edit.suggested)).toHaveLength(3); // name, tag, folder
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

describe('card shape', () => {
  const selected = (id: string) => screen.getByTestId(id).props.accessibilityState?.checked;

  test('a tall photo makes the card vertical, and it is saved that way', async () => {
    mockPickImage.mockResolvedValueOnce({ image: frontImage('tall', 0.63), original: null });
    await render(<EditCard />);
    await fireEvent.press(screen.getByTestId('front-library'));
    expect(selected('shape-vertical')).toBe(true);
    await save();
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ vertical: true }), expect.anything());
  });

  test('a wide photo stays horizontal, and the user can turn it upright', async () => {
    await render(<EditCard />);
    await fireEvent.press(screen.getByTestId('front-library'));
    expect(selected('shape-horizontal')).toBe(true);
    await fireEvent.press(screen.getByTestId('shape-vertical'));
    await save();
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ vertical: true }), expect.anything());
  });

  test('a portrait PDF page makes the card vertical', async () => {
    mockRenderCover.mockResolvedValueOnce(frontImage('page0', 0.707));
    await render(<EditCard />);
    await fireEvent.press(screen.getByTestId('front-pdf'));
    expect(selected('shape-vertical')).toBe(true);
  });

  test('there is no shape to choose before the card has a picture', async () => {
    await render(<EditCard />);
    expect(screen.queryByTestId('shape-vertical')).toBeNull();
  });
});

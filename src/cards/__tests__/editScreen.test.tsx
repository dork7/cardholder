import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { frontImage, image, makeCard } from '../../../test/fixtures';
import EditCard from '../../../app/edit/[id]';
import { Folder } from '../types';
import { Removal } from '../../app/undo';
import { strings } from '../../strings';
import { setPendingShared, takePendingShared } from '../../share/sharedIn';

let mockParams: { id: string; space?: string } = { id: 'new' };
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
const mockRestore = jest.fn((..._a: unknown[]) => Promise.resolve());
const mockOffer = jest.fn((_removal: Removal) => {});
const mockServices = {
  store: {
    create: (...a: unknown[]) => mockCreate(...a),
    update: (...a: unknown[]) => mockUpdate(...a),
    moveToRecentlyDeleted: (...a: unknown[]) => mockRemove(...a),
    restore: (...a: unknown[]) => mockRestore(...a),
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
    undo: { offer: (removal: Removal) => mockOffer(removal) },
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
const mockCropShared = jest.fn();
// The system camera app: a path to the photo taken, or null when cancelled. Unavailable on iOS.
const mockTakePhoto = jest.fn();
let mockCanTakePhoto = true;
jest.mock('../../images/capture', () => ({
  get canTakePhoto() {
    return mockCanTakePhoto;
  },
  takePhoto: () => mockTakePhoto(),
  pickImage: () => mockPickImage(),
  cropFullPhoto: (path: string) => mockCropFullPhoto(path),
  discardFile: (path: string) => mockDiscard(path),
  clearOriginals: () => mockClearOriginals(),
  cropSharedImage: (path: string) => mockCropShared(path),
}));
const mockDiscardShared = jest.fn();
jest.mock('../../share/sharedFiles', () => ({ discardShared: (paths: string[]) => mockDiscardShared(paths) }));
const mockPickPdf = jest.fn();
const mockReadPdf = jest.fn();
const mockRenderCover = jest.fn();
const mockRenderPdfPage = jest.fn();
jest.mock('../../images/pdf', () => {
  class PdfTooLargeError extends Error {}
  return {
    canPickPdf: true,
    pickPdf: () => mockPickPdf(),
    readPdf: (uri: string) => mockReadPdf(uri),
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
const mockIndexPdfAfterSave = jest.fn(async (..._args: unknown[]) => {});
jest.mock('../../cards/readBackfill', () => ({ indexPdfAfterSave: (...a: unknown[]) => mockIndexPdfAfterSave(...a) }));
const mockCheckPhotoQuality = jest.fn();
jest.mock('../../images/photoQuality', () => ({ checkPhotoQuality: (image: string) => mockCheckPhotoQuality(image) }));

let warn: jest.SpyInstance;
let alert: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  mockCanTakePhoto = true;
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
  mockIndexPdfAfterSave.mockClear();
  mockCheckPhotoQuality.mockResolvedValue(null);
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
    expect(mockDisablePrevention).toHaveBeenCalled();
    expect(mockDismissAll).toHaveBeenCalledTimes(1);
  });
});

describe('saving', () => {
  test('a blurry new photo asks before saving; Keep anyway saves it', async () => {
    mockCheckPhotoQuality.mockResolvedValue('blur');
    await fillNewCard();
    fireEvent.press(screen.getByTestId('save-card'));
    await waitFor(() => expect(alert).toHaveBeenCalledWith(
      strings.edit.photoQuality.title, expect.any(String), expect.any(Array), expect.any(Object),
    ));
    expect(mockCreate).not.toHaveBeenCalled();
    const buttons = alert.mock.calls.find(([title]) => title === strings.edit.photoQuality.title)?.[2] as {
      text: string; onPress?: () => void;
    }[];
    expect(buttons.map((button) => button.text)).toEqual([
      strings.edit.photoQuality.replace, strings.edit.photoQuality.keep,
    ]);
    await act(async () => buttons[1].onPress?.());
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
  });

  test('replacing a warned photo opens the picker and leaves the document unsaved', async () => {
    mockCheckPhotoQuality.mockResolvedValue('blur');
    await fillNewCard();
    fireEvent.press(screen.getByTestId('save-card'));
    await waitFor(() => expect(alert).toHaveBeenCalledWith(
      strings.edit.photoQuality.title, expect.any(String), expect.any(Array), expect.any(Object),
    ));
    const buttons = alert.mock.calls.find(([title]) => title === strings.edit.photoQuality.title)?.[2] as {
      text: string; onPress?: () => void;
    }[];
    await act(async () => buttons[0].onPress?.());
    await waitFor(() => expect(mockPickImage).toHaveBeenCalledTimes(2));
    expect(mockCreate).not.toHaveBeenCalled();
  });

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
    mockUpdate.mockRejectedValueOnce(new Error('io error'));
    await render(<EditCard />);
    await save();
    expect(alert).toHaveBeenCalledWith(strings.errors.actions.save.title, strings.errors.actions.save.body);
    expect(mockBack).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
    await save();
    expect(mockUpdate).toHaveBeenCalledTimes(2);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  test('a save that fails because the phone is full says so', async () => {
    mockParams = { id: 'card1' };
    mockCards = [makeCard()];
    mockUpdate.mockRejectedValueOnce(new Error('database or disk is full'));
    await render(<EditCard />);
    await save();
    expect(alert).toHaveBeenCalledWith(strings.errors.actions.save.title, strings.errors.storageFull);
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
    expect(mockAnalyze).toHaveBeenCalledWith(frontImage('page0').jpegBase64);
    expect(mockAnalyze).toHaveBeenCalledWith(image('back1').jpegBase64);
    expect(screen.getByTestId('back-remove')).toBeTruthy();
    expect(screen.getByRole('radio', { name: strings.edit.pageLabel(1) })).toBeChecked();
    expect(screen.getByRole('radio', { name: strings.edit.pageLabel(3) })).not.toBeChecked();
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

  test('a saved PDF starts reading every page for search', async () => {
    mockCreate.mockResolvedValueOnce(makeCard({ pdf: { pageCount: 3, coverPage: 0 }, readText: null }));
    await render(<EditCard />);
    await fireEvent.press(screen.getByTestId('front-pdf'));
    await save();
    expect(mockIndexPdfAfterSave).toHaveBeenCalledWith(
      mockServices.store, expect.objectContaining({ pdf: { pageCount: 3, coverPage: 0 } }),
      expect.any(Function), expect.any(Function),
    );
  });

  test('choosing another page makes it the thumbnail', async () => {
    await render(<EditCard />);
    await fireEvent.press(screen.getByTestId('front-pdf'));
    await fireEvent.press(screen.getByTestId('pdf-page-2'));
    expect(mockRenderCover).toHaveBeenLastCalledWith(pdfDoc(2));
    expect(screen.getByRole('radio', { name: strings.edit.pageLabel(3) })).toBeChecked();
    expect(screen.getByRole('radio', { name: strings.edit.pageLabel(1) })).not.toBeChecked();
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

  test('a new tag longer than 24 characters shows an error without truncating it', async () => {
    await fillNewCard();
    await fireEvent.press(screen.getByTestId('tag-add'));
    const longName = 'A tag name longer than twenty four';
    await fireEvent.changeText(screen.getByTestId('new-tag-name'), longName);
    await fireEvent.press(screen.getByTestId('new-tag-submit'));
    expect(screen.getByTestId('new-tag-name').props.value).toBe(longName);
    expect(screen.getByTestId('new-tag-name').props.maxLength).toBeUndefined();
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

  test('a ninth new tag is refused when chosen, before save', async () => {
    await fillNewCard();
    for (let i = 0; i < 9; i++) {
      await fireEvent.press(screen.getByTestId('tag-add'));
      await fireEvent.changeText(screen.getByTestId('new-tag-name'), `tag ${i}`);
      await fireEvent.press(screen.getByTestId('new-tag-submit'));
    }
    expect(alert).toHaveBeenLastCalledWith(strings.tags.tooManyTitle, strings.tags.tooMany(1, 8));
    expect(screen.getByTestId('new-tag-name').props.value).toBe('tag 8');
    await save();
    expect(screen.queryByText(strings.edit.errors['bad-tags'])).toBeNull();
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ tags: Array.from({ length: 8 }, (_, i) => `tag ${i}`) }), expect.anything());
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
    mockCards = [makeCard({ name: 'Gym' })];
    await render(<EditCard />);
    await fireEvent.press(screen.getByRole('button', { name: strings.edit.deleteCard }));
  }

  test('Delete removes the card at once, with no dialog, returns home and offers Undo', async () => {
    await confirmDelete();
    expect(alert).not.toHaveBeenCalled();
    expect(mockRemove).toHaveBeenCalledWith('card1');
    expect(mockDismissAll).toHaveBeenCalledTimes(1);
    expect(mockOffer).toHaveBeenCalledWith(expect.objectContaining({ message: 'Deleted Gym' }));
    await mockOffer.mock.calls[0][0].undo();
    expect(mockRestore).toHaveBeenCalledWith('card1');
  });

  test('a failed removal says the delete failed and stays on the screen', async () => {
    mockRemove.mockRejectedValue(new Error('io error'));
    await confirmDelete();
    expect(alert).toHaveBeenCalledWith(strings.errors.actions.delete.title, strings.errors.actions.delete.body);
    expect(mockRefresh).not.toHaveBeenCalled();
    expect(mockDismissAll).not.toHaveBeenCalled();
    expect(mockOffer).not.toHaveBeenCalled();
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
    expect(mockAnalyze).toHaveBeenCalledWith(frontImage('picked').jpegBase64);
    expect(screen.getByTestId('card-name').props.value).toBe('Emirates ID');
    expect(screen.getAllByText(strings.edit.suggested)).toHaveLength(3);
    await save();
    expect(mockCreate).toHaveBeenCalledWith(
      { name: 'Emirates ID', expiresOn: '2030-11-09', remindDaysBefore: 14, tags: ['Insurance'], documentKey: KEY, folderId: null, personId: null, readText: { front: 'UNITED ARAB EMIRATES', back: '' }, vertical: false, blurPreview: false },
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
      { name: 'Gym', expiresOn: '2030-11-09', remindDaysBefore: 14, tags: ['Membership'], documentKey: KEY, folderId: null, personId: null, readText: { front: '', back: '' }, vertical: false, blurPreview: false }, // blanks filled; the new front was read, and this card has no back
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
    expect(mockAnalyze).toHaveBeenLastCalledWith(frontImage('whole').jpegBase64);
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

  test('a replaced card clears a legacy folder assignment', async () => {
    mockCards = [makeCard({ id: 'old', name: 'Emirates ID', tags: ['ID'], documentKey: KEY, folderId: 'fam' })];
    answer(strings.edit.replace);
    await fillNewCard();
    await save();
    expect(mockUpdate).toHaveBeenCalledWith('old', expect.objectContaining({ folderId: null }), expect.anything());
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

test('the editor has no folder picker', async () => {
  await fillNewCard();
  expect(screen.queryByTestId('folder-add')).toBeNull();
  expect(screen.queryByTestId('folder-offer')).toBeNull();
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


test('blur preview can be selected and saved with a document', async () => {
  await fillNewCard();
  expect(screen.getByTestId('preview-clear').props.accessibilityState.checked).toBe(true);
  await fireEvent.press(screen.getByTestId('preview-blurred'));
  expect(screen.getByTestId('preview-blurred').props.accessibilityState.checked).toBe(true);
  await save();
  expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ blurPreview: true }), expect.anything());
});

describe('reminder days', () => {
  const checked = (id: string) => screen.getByTestId(id).props.accessibilityState?.checked;
  async function openCard(remindDaysBefore: number) {
    mockParams = { id: 'card1' };
    mockCards = [makeCard({ expiresOn: '2030-11-09', remindDaysBefore })];
    await render(<EditCard />);
  }
  const savedDays = () => mockUpdate.mock.calls[0][1].remindDaysBefore;

  test('choosing 7, 14 or 30 days sets the reminder', async () => {
    await openCard(14);
    expect(checked('remind-14')).toBe(true);
    await fireEvent.press(screen.getByTestId('remind-30'));
    expect(checked('remind-30')).toBe(true);
    expect(checked('remind-14')).toBe(false);
    await save();
    expect(savedDays()).toBe(30);
  });

  test('the number field shows only under Custom, and saves the number typed there', async () => {
    await openCard(14);
    expect(screen.queryByTestId('remind-days')).toBeNull();
    await fireEvent.press(screen.getByTestId('remind-custom'));
    expect(checked('remind-custom')).toBe(true);
    expect(checked('remind-14')).toBe(false);
    await fireEvent.changeText(screen.getByTestId('remind-days'), '45');
    await save();
    expect(savedDays()).toBe(45);
  });

  test('a document saved with another number opens on Custom with that number', async () => {
    await openCard(60);
    expect(checked('remind-custom')).toBe(true);
    expect(screen.getByTestId('remind-days').props.value).toBe('60');
  });

  test('clearing the custom field means the default, and Custom stays chosen', async () => {
    await openCard(60);
    await fireEvent.changeText(screen.getByTestId('remind-days'), '');
    expect(checked('remind-custom')).toBe(true);
    expect(screen.getByText(strings.edit.remindDaysHint(14))).toBeTruthy();
    await save();
    expect(savedDays()).toBe(14);
  });

  test('a new document starts on 14 days', async () => {
    await fillNewCard();
    await fireEvent.press(screen.getByRole('button', { name: strings.edit.addExpiry }));
    expect(checked('remind-14')).toBe(true);
  });
});

test('the name field capitalises words and closes the keyboard on Done', async () => {
  await render(<EditCard />);
  const name = screen.getByTestId('card-name');
  expect(name.props.autoCapitalize).toBe('words');
  expect(name.props.returnKeyType).toBe('done');
});

describe('opened with something shared from another app', () => {
  test('two shared photos are cropped in turn into the front and the back, then deleted', async () => {
    setPendingShared({ kind: 'photos', paths: ['file:///cache/shared/1-0.jpg', 'file:///cache/shared/1-1.jpg'] });
    mockCropShared.mockResolvedValueOnce(frontImage('first')).mockResolvedValueOnce(frontImage('second'));
    await render(<EditCard />);
    await waitFor(() => expect(mockDiscardShared).toHaveBeenCalledWith(['file:///cache/shared/1-0.jpg', 'file:///cache/shared/1-1.jpg']));
    expect(mockCropShared.mock.calls).toEqual([['file:///cache/shared/1-0.jpg'], ['file:///cache/shared/1-1.jpg']]);
    await save();
    expect(mockCreate).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ front: frontImage('first'), back: frontImage('second') }));
  });

  test('cancelling the first crop adds nothing, and the photos are still deleted', async () => {
    setPendingShared({ kind: 'photos', paths: ['file:///cache/shared/2-0.jpg', 'file:///cache/shared/2-1.jpg'] });
    mockCropShared.mockResolvedValue(null);
    await render(<EditCard />);
    await waitFor(() => expect(mockDiscardShared).toHaveBeenCalled());
    expect(mockCropShared).toHaveBeenCalledTimes(1);
    expect(mockAnalyze).not.toHaveBeenCalled();
  });

  test('a shared PDF becomes a PDF document, and the shared copy is deleted', async () => {
    setPendingShared({ kind: 'pdf', path: 'file:///cache/shared/3-0.pdf' });
    mockReadPdf.mockResolvedValue(pdfDoc(0));
    await render(<EditCard />);
    await waitFor(() => expect(mockRenderCover).toHaveBeenCalledWith(pdfDoc(0)));
    expect(mockReadPdf).toHaveBeenCalledWith('file:///cache/shared/3-0.pdf');
    expect(mockDiscardShared).toHaveBeenCalledWith(['file:///cache/shared/3-0.pdf']);
  });

  test('a shared photo that cannot be opened says so', async () => {
    setPendingShared({ kind: 'photos', paths: ['file:///cache/shared/4-0.jpg'] });
    mockCropShared.mockRejectedValue(new Error('unreadable'));
    await render(<EditCard />);
    await waitFor(() => expect(alert).toHaveBeenCalledWith(strings.shareIn.failed));
    expect(mockDiscardShared).toHaveBeenCalledWith(['file:///cache/shared/4-0.jpg']);
  });

  test('editing a saved document never takes what was shared', async () => {
    mockCards = [makeCard({ id: 'old', name: 'Emirates ID' })];
    mockParams = { id: 'old' };
    setPendingShared({ kind: 'photos', paths: ['file:///cache/shared/5-0.jpg'] });
    await render(<EditCard />);
    expect(mockCropShared).not.toHaveBeenCalled();
    expect(takePendingShared()).not.toBeNull();
  });
});

describe('taking a photo with the camera', () => {
  const SHOT = 'file:///cache/capture-1.jpg';

  test('a photo taken for the front is cropped, becomes the front and is read, then deleted', async () => {
    mockTakePhoto.mockResolvedValue(SHOT);
    mockCropShared.mockResolvedValue(frontImage('shot'));
    await render(<EditCard />);
    await fireEvent.press(screen.getByTestId('front-camera'));
    expect(mockCropShared).toHaveBeenCalledWith(SHOT);
    expect(mockAnalyze).toHaveBeenCalledWith(frontImage('shot').jpegBase64);
    expect(mockDiscard).toHaveBeenCalledWith(SHOT);
    await save();
    expect(mockCreate).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ front: frontImage('shot') }));
  });

  test('a photo taken for the back becomes the back', async () => {
    await render(<EditCard />);
    await fireEvent.press(screen.getByTestId('front-library'));
    mockTakePhoto.mockResolvedValue(SHOT);
    mockCropShared.mockResolvedValue(frontImage('back-shot'));
    await fireEvent.press(screen.getByTestId('back-camera'));
    await fireEvent.changeText(screen.getByTestId('card-name'), 'Gym');
    await save();
    expect(mockCreate).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ front: frontImage('picked'), back: frontImage('back-shot') }));
  });

  test('cancelling the camera leaves the form unchanged', async () => {
    mockTakePhoto.mockResolvedValue(null);
    await render(<EditCard />);
    await fireEvent.press(screen.getByTestId('front-camera'));
    expect(mockCropShared).not.toHaveBeenCalled();
    expect(mockAnalyze).not.toHaveBeenCalled();
    expect(screen.queryByTestId('back-library')).toBeNull(); // still no front
    expect(alert).not.toHaveBeenCalled();
  });

  test('cancelling the crop leaves the form unchanged, and the photo is still deleted', async () => {
    mockTakePhoto.mockResolvedValue(SHOT);
    mockCropShared.mockResolvedValue(null);
    await render(<EditCard />);
    await fireEvent.press(screen.getByTestId('front-camera'));
    expect(mockAnalyze).not.toHaveBeenCalled();
    expect(screen.queryByTestId('back-library')).toBeNull();
    expect(mockDiscard).toHaveBeenCalledWith(SHOT);
  });

  test('a camera that fails says so, and the photo is still deleted', async () => {
    mockTakePhoto.mockResolvedValue(SHOT);
    mockCropShared.mockRejectedValue(new Error('unreadable'));
    await render(<EditCard />);
    await fireEvent.press(screen.getByTestId('front-camera'));
    expect(alert).toHaveBeenCalledWith(strings.edit.cameraFailed);
    expect(mockDiscard).toHaveBeenCalledWith(SHOT);
  });

  test('a photo taken for the front of a PDF document turns it into a photo document', async () => {
    await render(<EditCard />);
    await fireEvent.press(screen.getByTestId('front-pdf'));
    mockTakePhoto.mockResolvedValue(SHOT);
    mockCropShared.mockResolvedValue(frontImage('shot'));
    await fireEvent.press(screen.getByTestId('front-camera'));
    await fireEvent.changeText(screen.getByTestId('card-name'), 'Gym');
    await save();
    // No PDF, and the back (a page of that PDF) went with it.
    expect(mockCreate.mock.calls.at(-1)?.[1]).toEqual({ front: frontImage('shot'), back: null });
  });

  test('the Front hint points at Take photo and the photo library, not another app', async () => {
    await render(<EditCard />);
    expect(screen.getByText(/Take photo.*photo library/)).toBeTruthy();
    expect(screen.queryByText(/camera app/)).toBeNull();
  });

  test('without the camera, the Front hint points at the photo library only', async () => {
    mockCanTakePhoto = false;
    await render(<EditCard />);
    expect(screen.queryByText(/Take photo/)).toBeNull();
    expect(screen.getByText(/photo library/)).toBeTruthy();
    expect(screen.queryByText(/camera app/)).toBeNull();
  });

  test('Take photo is not offered where the camera cannot be used', async () => {
    mockCanTakePhoto = false;
    await render(<EditCard />);
    expect(screen.queryByTestId('front-camera')).toBeNull();
    await fireEvent.press(screen.getByTestId('front-library'));
    expect(screen.queryByTestId('back-camera')).toBeNull();
  });
});

describe('Space', () => {
  const chip = (id: string) => screen.getByTestId(`assign-space-${id}`).props.accessibilityState;

  test('a new document starts in Personal and saves the Space chosen', async () => {
    await fillNewCard();
    expect(chip('personal')).toMatchObject({ checked: true });
    await fireEvent.press(screen.getByTestId('assign-space-family'));
    expect(chip('family')).toMatchObject({ checked: true });
    await save();
    expect(mockCreate.mock.calls[0][0]).toMatchObject({ spaceId: 'family' });
  });

  test('a document added from inside a Space starts in that Space', async () => {
    mockParams = { id: 'new', space: 'travel' };
    await fillNewCard();
    expect(chip('travel')).toMatchObject({ checked: true });
    await save();
    expect(mockCreate.mock.calls[0][0]).toMatchObject({ spaceId: 'travel' });
  });

  test('an unknown Space in the link falls back to Personal', async () => {
    mockParams = { id: 'new', space: 'office' };
    await fillNewCard();
    expect(chip('personal')).toMatchObject({ checked: true });
  });

  test('moving a saved document to another Space counts as a change and keeps its other fields', async () => {
    mockParams = { id: 'card1' };
    mockCards = [makeCard({ name: 'Gym', tags: ['Membership'], spaceId: 'home' })];
    await render(<EditCard />);
    expect(chip('home')).toMatchObject({ checked: true });
    expect(mockGuard.on).toBe(false);
    await fireEvent.press(screen.getByTestId('assign-space-travel'));
    expect(mockGuard.on).toBe(true);
    await save();
    expect(mockUpdate.mock.calls[0][0]).toBe('card1');
    expect(mockUpdate.mock.calls[0][1]).toMatchObject({ spaceId: 'travel', name: 'Gym', tags: ['Membership'] });
  });
});

import * as Sharing from 'expo-sharing';
import { makeCard } from '../../../test/fixtures';
import { base64, utf8 } from '../../crypto/bytes';
import {
  backupFileName,
  cardFileBase,
  exportCardPdf,
  freeFileName,
  PdfUnavailableError,
  shareBackupFile,
  shareCard,
  shareCardMarkdown,
  shareCards,
} from '../shareCard';

// A tiny in-memory stand-in for the cache directory: enough to see what was written and cleaned up.
const mockDisk = new Map<string, Uint8Array>();
// The folder the user picks for "Save to Files"; null means the picker is cancelled.
let mockPicked: string | null = 'picked';
jest.mock('expo-file-system', () => {
  const pathOf = (...parts: Array<string | { uri: string }>) =>
    parts.map((p) => (typeof p === 'string' ? p : p.uri)).join('/');
  class Directory {
    static async pickDirectoryAsync() {
      if (mockPicked === null) throw Object.assign(new Error('File picking was cancelled by the user'), { code: 'ERR_FILE_PICKING_CANCELLED' });
      return new Directory(mockPicked);
    }
    uri: string;
    constructor(...parts: Array<string | { uri: string }>) {
      this.uri = pathOf(...parts);
    }
    get exists() {
      return [...mockDisk.keys()].some((k) => k.startsWith(`${this.uri}/`));
    }
    create() {}
    delete() {
      for (const k of [...mockDisk.keys()]) if (k.startsWith(`${this.uri}/`)) mockDisk.delete(k);
    }
    list() {
      return [...mockDisk.keys()].filter((k) => k.startsWith(`${this.uri}/`)).map((k) => new File(k));
    }
    createFile(name: string) {
      const file = new File(this, name);
      if (mockDisk.has(file.uri)) throw new Error('Destination already exists');
      file.create();
      return file;
    }
  }
  class File {
    uri: string;
    constructor(...parts: Array<string | { uri: string }>) {
      this.uri = pathOf(...parts);
    }
    create() {
      mockDisk.set(this.uri, new Uint8Array());
    }
    get name() {
      return this.uri.slice(this.uri.lastIndexOf('/') + 1);
    }
    async bytes() {
      return mockDisk.get(this.uri) as Uint8Array;
    }
    async write(bytes: Uint8Array) {
      mockDisk.set(this.uri, bytes);
    }
    get exists() {
      return mockDisk.has(this.uri);
    }
    delete() {
      mockDisk.delete(this.uri);
    }
    // Async, as in expo-file-system: a caller that doesn't wait shares a file that isn't there yet.
    async move(to: { uri: string }) {
      await Promise.resolve();
      mockDisk.set(to.uri, mockDisk.get(this.uri) as Uint8Array);
      mockDisk.delete(this.uri);
      this.uri = to.uri;
    }
  }
  return { Directory, File, Paths: { cache: 'cache' } };
});
jest.mock('expo-sharing', () => ({ shareAsync: jest.fn() }));
// Joins the JPEGs it is given into a fake PDF, outside the share folder like the native module.
let mockPdfAvailable = true;
jest.mock('../../images/pdf', () => ({
  imagesToPdf: (uris: string[]) => {
    if (!mockPdfAvailable) return null;
    const out = 'cache/pdf-made.pdf';
    mockDisk.set(out, new TextEncoder().encode(`PDF:${uris.join('+')}`));
    return Promise.resolve(out);
  },
  // Each page of a PDF card drawn as a JPEG marker naming its page.
  renderPages: async (pdf: { pageCount: number }, _edge: number, onPage: (i: number, img: { jpegBase64: string }) => void) => {
    for (let i = 0; i < pdf.pageCount; i++) onPage(i, { jpegBase64: Buffer.from(`JPEG:pdf-page-${i + 1}`).toString('base64') });
  },
}));

const shareAsync = Sharing.shareAsync as jest.Mock;
const jpeg = base64.encode(utf8.encode('JPEG:front'));
const store = { loadImage: jest.fn(), loadPdf: jest.fn() } as unknown as Parameters<typeof shareCard>[0];
const PDF = { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' };

let shared: { uri: string; bytes?: Uint8Array } | null;
beforeEach(() => {
  mockDisk.clear();
  mockPdfAvailable = true;
  mockPicked = 'picked';
  shared = null;
  shareAsync.mockReset();
  shareAsync.mockImplementation(async (uri: string) => {
    shared = { uri, bytes: mockDisk.get(uri) };
  });
  (store.loadImage as jest.Mock).mockImplementation((_id: string, side: string) =>
    Promise.resolve(base64.encode(utf8.encode(`JPEG:${side}`))),
  );
  (store.loadPdf as jest.Mock).mockResolvedValue(base64.encode(utf8.encode('%PDF-1.7 policy')));
});

test('file names come from the card and cannot form a path', () => {
  expect(cardFileBase({ name: 'Gym card!', category: 'membership' })).toBe('Gym card');
  expect(cardFileBase({ name: '../../etc', category: 'id' })).toBe('etc');
  expect(cardFileBase({ name: '', category: 'insurance' })).toBe('Insurance');
  expect(cardFileBase({ name: '///', category: 'other' })).toBe('card');
});

test('a front-only card shares its photo, then removes the copy', async () => {
  await shareCard(store, makeCard({ name: 'Gym' }));
  expect(shared).toEqual({ uri: 'cache/share/Gym-front.jpg', bytes: utf8.encode('JPEG:front') });
  expect(shareAsync).toHaveBeenCalledWith('cache/share/Gym-front.jpg', { mimeType: 'image/jpeg', UTI: 'public.jpeg' });
  expect(mockDisk.size).toBe(0);
});

test('a card with a back shares one PDF of both sides', async () => {
  await shareCard(store, makeCard({ name: 'Gym', hasBack: true, backAspect: 1.586 }));
  expect(shareAsync).toHaveBeenCalledWith('cache/share/Gym.pdf', PDF);
  expect(new TextDecoder().decode(shared?.bytes)).toBe('PDF:cache/share/Gym-front.jpg+cache/share/Gym-back.jpg');
  expect(mockDisk.size).toBe(0);
});

test('without the PDF module, a card with a back shares its front photo', async () => {
  mockPdfAvailable = false;
  await shareCard(store, makeCard({ name: 'Gym', hasBack: true, backAspect: 1.586 }));
  expect(shareAsync).toHaveBeenCalledWith('cache/share/Gym-front.jpg', expect.anything());
});

test('a PDF card shares the PDF itself', async () => {
  await shareCard(store, makeCard({ name: 'Policy', pdf: { pageCount: 2, coverPage: 0 } }));
  expect(shared).toEqual({ uri: 'cache/share/Policy.pdf', bytes: utf8.encode('%PDF-1.7 policy') });
  expect(shareAsync).toHaveBeenCalledWith('cache/share/Policy.pdf', PDF);
  expect(mockDisk.size).toBe(0);
});

test('the copies are removed even when sharing fails', async () => {
  shareAsync.mockRejectedValue(new Error('no share sheet'));
  await expect(shareCard(store, makeCard({ hasBack: true, backAspect: 1.586 }))).rejects.toThrow('no share sheet');
  expect(mockDisk.size).toBe(0);
});

test('a card without a front photo shares nothing', async () => {
  (store.loadImage as jest.Mock).mockResolvedValue(null);
  await shareCard(store, makeCard());
  expect(shareAsync).not.toHaveBeenCalled();
});

test('backup files are named for the local date', () => {
  expect(backupFileName(new Date(2026, 0, 5, 23, 30))).toBe('DocKeeper-backup-2026-01-05.cardholder');
});

test('shares the backup bytes as a file, then removes the copy', async () => {
  let shared: Uint8Array | undefined;
  shareAsync.mockImplementation(async (uri: string) => {
    shared = mockDisk.get(uri);
  });
  const bytes = utf8.encode('CHBK…');
  await shareBackupFile(bytes, new Date(2026, 9, 23));
  expect(shareAsync).toHaveBeenCalledWith('cache/share/DocKeeper-backup-2026-10-23.cardholder', {
    mimeType: 'application/octet-stream',
    UTI: 'public.data',
  });
  expect(shared).toEqual(bytes);
  expect(mockDisk.size).toBe(0);
});

test('the backup copy is removed even when sharing fails', async () => {
  shareAsync.mockRejectedValue(new Error('no share sheet'));
  await expect(shareBackupFile(utf8.encode('x'), new Date())).rejects.toThrow('no share sheet');
  expect(mockDisk.size).toBe(0);
});

describe('sharing several cards', () => {
  const madeFrom = () => new TextDecoder().decode(shared?.bytes).replace('PDF:', '').split('+');

  test('one PDF with every side of every card, in the order picked', async () => {
    (store.loadImage as jest.Mock).mockImplementation((id: string, side: string) =>
      Promise.resolve(base64.encode(utf8.encode(`JPEG:${id}-${side}`))),
    );
    await shareCards(store, [
      makeCard({ id: 'a', name: 'Gym', hasBack: true, backAspect: 1.586 }),
      makeCard({ id: 'b', name: 'Policy', pdf: { pageCount: 2, coverPage: 0 } }),
      makeCard({ id: 'c', name: 'Library' }),
    ]);
    expect(shareAsync).toHaveBeenCalledWith('cache/share/DocKeeper-3-cards.pdf', PDF);
    expect(madeFrom()).toEqual(['1', '2', '3', '4', '5'].map((n) => `cache/share/page-${n}.jpg`));
    expect(mockDisk.size).toBe(0);
  });

  test('pages come from the right places: photos, then each page of a PDF card', async () => {
    const written: string[] = [];
    shareAsync.mockImplementation(async () => {
      for (const [uri, bytes] of mockDisk) if (uri.endsWith('.jpg')) written.push(`${uri}=${utf8.decode(bytes)}`);
    });
    (store.loadImage as jest.Mock).mockImplementation((id: string, side: string) =>
      Promise.resolve(base64.encode(utf8.encode(`JPEG:${id}-${side}`))),
    );
    await shareCards(store, [makeCard({ id: 'a', hasBack: true, backAspect: 1.586 }), makeCard({ id: 'b', pdf: { pageCount: 2, coverPage: 0 } })]);
    expect(written.sort()).toEqual([
      'cache/share/page-1.jpg=JPEG:a-front',
      'cache/share/page-2.jpg=JPEG:a-back',
      'cache/share/page-3.jpg=JPEG:pdf-page-1',
      'cache/share/page-4.jpg=JPEG:pdf-page-2',
    ]);
  });

  test('a single card is shared as on its own screen', async () => {
    await shareCards(store, [makeCard({ name: 'Gym' })]);
    expect(shareAsync).toHaveBeenCalledWith('cache/share/Gym-front.jpg', expect.anything());
  });

  test('without the PDF module it says so instead of sharing part of the selection', async () => {
    mockPdfAvailable = false;
    await expect(shareCards(store, [makeCard({ id: 'a' }), makeCard({ id: 'b' })])).rejects.toBeInstanceOf(PdfUnavailableError);
    expect(shareAsync).not.toHaveBeenCalled();
    expect(mockDisk.size).toBe(0);
  });

  test('the copies are removed even when sharing fails', async () => {
    shareAsync.mockRejectedValue(new Error('no share sheet'));
    await expect(shareCards(store, [makeCard({ id: 'a' }), makeCard({ id: 'b' })])).rejects.toThrow('no share sheet');
    expect(mockDisk.size).toBe(0);
  });
});

test('the details share as a .md file named after the card, then the copy is removed', async () => {
  await shareCardMarkdown(makeCard({ name: 'Residence' }), '# Residence\n');
  expect(shared).toEqual({ uri: 'cache/share/Residence.md', bytes: utf8.encode('# Residence\n') });
  expect(shareAsync).toHaveBeenCalledWith('cache/share/Residence.md', { mimeType: 'text/markdown', UTI: 'net.daringfireball.markdown' });
  expect(mockDisk.size).toBe(0);
});

describe('exporting a card as a PDF', () => {
  const text = (uri: string) => new TextDecoder().decode(mockDisk.get(uri));
  const pickedFiles = () => [...mockDisk.keys()].filter((k) => k.startsWith('picked/')).sort();

  test('a front-only card still goes as a PDF, not a photo', async () => {
    await exportCardPdf(store, makeCard({ name: 'Gym' }), 'send');
    expect(shareAsync).toHaveBeenCalledWith('cache/share/Gym.pdf', PDF);
    expect(new TextDecoder().decode(shared?.bytes)).toBe('PDF:cache/share/Gym-front.jpg');
    expect(mockDisk.size).toBe(0);
  });

  test('a card with a back is one PDF, front then back', async () => {
    await exportCardPdf(store, makeCard({ name: 'Gym', hasBack: true, backAspect: 1.586 }), 'send');
    expect(new TextDecoder().decode(shared?.bytes)).toBe('PDF:cache/share/Gym-front.jpg+cache/share/Gym-back.jpg');
  });

  test('saves into the picked folder and leaves no copy in the cache', async () => {
    const name = await exportCardPdf(store, makeCard({ name: 'Gym', hasBack: true, backAspect: 1.586 }), 'files');
    expect(name).toBe('Gym.pdf');
    expect(shareAsync).not.toHaveBeenCalled();
    expect(pickedFiles()).toEqual(['picked/Gym.pdf']);
    expect(text('picked/Gym.pdf')).toBe('PDF:cache/share/Gym-front.jpg+cache/share/Gym-back.jpg');
    expect([...mockDisk.keys()].filter((k) => k.startsWith('cache/'))).toEqual([]);
  });

  test('a PDF card saves its own PDF', async () => {
    await exportCardPdf(store, makeCard({ name: 'Policy', pdf: { pageCount: 2, coverPage: 0 } }), 'files');
    expect(text('picked/Policy.pdf')).toBe('%PDF-1.7 policy');
  });

  test('saving twice keeps both files', async () => {
    const card = makeCard({ name: 'Gym' });
    await exportCardPdf(store, card, 'files');
    expect(await exportCardPdf(store, card, 'files')).toBe('Gym (2).pdf');
    expect(pickedFiles()).toEqual(['picked/Gym (2).pdf', 'picked/Gym.pdf']);
  });

  test('cancelling the folder picker saves nothing and is not an error', async () => {
    mockPicked = null;
    await expect(exportCardPdf(store, makeCard({ name: 'Gym' }), 'files')).resolves.toBeNull();
    expect(mockDisk.size).toBe(0);
  });

  test('without the PDF module it says so', async () => {
    mockPdfAvailable = false;
    await expect(exportCardPdf(store, makeCard({ name: 'Gym' }), 'send')).rejects.toBeInstanceOf(PdfUnavailableError);
    expect(shareAsync).not.toHaveBeenCalled();
    expect(mockDisk.size).toBe(0);
  });

  test('free file names count up past the ones taken', () => {
    expect(freeFileName('Gym.pdf', new Set())).toBe('Gym.pdf');
    expect(freeFileName('Gym.pdf', new Set(['Gym.pdf', 'Gym (2).pdf']))).toBe('Gym (3).pdf');
    expect(freeFileName('notes', new Set(['notes']))).toBe('notes (2)');
  });
});

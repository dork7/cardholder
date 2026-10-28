import * as Sharing from 'expo-sharing';
import { makeCard } from '../../../test/fixtures';
import { base64, utf8 } from '../../crypto/bytes';
import { backupFileName, cardFileBase, shareBackupFile, shareCard } from '../shareCard';

// A tiny in-memory stand-in for the cache directory: enough to see what was written and cleaned up.
const mockDisk = new Map<string, Uint8Array>();
jest.mock('expo-file-system', () => {
  const pathOf = (...parts: Array<string | { uri: string }>) =>
    parts.map((p) => (typeof p === 'string' ? p : p.uri)).join('/');
  class Directory {
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
  }
  class File {
    uri: string;
    constructor(...parts: Array<string | { uri: string }>) {
      this.uri = pathOf(...parts);
    }
    create() {
      mockDisk.set(this.uri, new Uint8Array());
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
    move(to: { uri: string }) {
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
}));

const shareAsync = Sharing.shareAsync as jest.Mock;
const jpeg = base64.encode(utf8.encode('JPEG:front'));
const store = { loadImage: jest.fn(), loadPdf: jest.fn() } as unknown as Parameters<typeof shareCard>[0];
const PDF = { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' };

let shared: { uri: string; bytes?: Uint8Array } | null;
beforeEach(() => {
  mockDisk.clear();
  mockPdfAvailable = true;
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

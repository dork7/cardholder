import * as Sharing from 'expo-sharing';
import { makeCard } from '../../../test/fixtures';
import { base64, utf8 } from '../../crypto/bytes';
import { backupFileName, cardImageFileName, shareBackupFile, shareCardImage } from '../shareCard';

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
  }
  return { Directory, File, Paths: { cache: 'cache' } };
});
jest.mock('expo-sharing', () => ({ shareAsync: jest.fn() }));

const shareAsync = Sharing.shareAsync as jest.Mock;
const jpeg = base64.encode(utf8.encode('JPEG:front'));
const store = { loadImage: jest.fn() } as unknown as Parameters<typeof shareCardImage>[0];

beforeEach(() => {
  mockDisk.clear();
  shareAsync.mockReset();
  (store.loadImage as jest.Mock).mockResolvedValue(jpeg);
});

test('file names come from the card and cannot form a path', () => {
  expect(cardImageFileName({ name: 'Gym card!', category: 'membership' }, 'front')).toBe('Gym card-front.jpg');
  expect(cardImageFileName({ name: '../../etc', category: 'id' }, 'front')).toBe('etc-front.jpg');
  expect(cardImageFileName({ name: '', category: 'insurance' }, 'back')).toBe('Insurance-back.jpg');
  expect(cardImageFileName({ name: '///', category: 'other' }, 'front')).toBe('card-front.jpg');
});

test('shares the decrypted front photo as a JPEG file, then removes the copy', async () => {
  let shared: { uri: string; bytes?: Uint8Array } | null = null;
  shareAsync.mockImplementation(async (uri: string) => {
    shared = { uri, bytes: mockDisk.get(uri) };
  });
  await shareCardImage(store, makeCard({ name: 'Gym' }));
  expect(shared).toEqual({ uri: 'cache/share/Gym-front.jpg', bytes: utf8.encode('JPEG:front') });
  expect(shareAsync).toHaveBeenCalledWith('cache/share/Gym-front.jpg', { mimeType: 'image/jpeg', UTI: 'public.jpeg' });
  expect(mockDisk.size).toBe(0);
});

test('the copy is removed even when sharing fails', async () => {
  shareAsync.mockRejectedValue(new Error('no share sheet'));
  await expect(shareCardImage(store, makeCard())).rejects.toThrow('no share sheet');
  expect(mockDisk.size).toBe(0);
});

test('a card without a front photo shares nothing', async () => {
  (store.loadImage as jest.Mock).mockResolvedValue(null);
  await shareCardImage(store, makeCard());
  expect(shareAsync).not.toHaveBeenCalled();
});

test('backup files are named for the local date', () => {
  expect(backupFileName(new Date(2026, 0, 5, 23, 30))).toBe('CardHolder-backup-2026-01-05.cardholder');
});

test('shares the backup bytes as a file, then removes the copy', async () => {
  let shared: Uint8Array | undefined;
  shareAsync.mockImplementation(async (uri: string) => {
    shared = mockDisk.get(uri);
  });
  const bytes = utf8.encode('CHBK…');
  await shareBackupFile(bytes, new Date(2026, 9, 23));
  expect(shareAsync).toHaveBeenCalledWith('cache/share/CardHolder-backup-2026-10-23.cardholder', {
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

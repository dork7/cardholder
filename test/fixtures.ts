import { BackupSnapshot } from '../src/backup/backupFile';
import { createAead, generateKey } from '../src/crypto/aead';
import { base64, utf8 } from '../src/crypto/bytes';
import { createCardStore, ImportEntry } from '../src/cards/cardStore';
import { Card, CardFields, CardImage, FrontImage, NewCardImages } from '../src/cards/types';
import { migrate } from '../src/storage/sqlDb';
import { createMemoryBlobStore } from './memoryBlobStore';
import { memoryDb } from './memoryDb';

export function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'card1',
    name: 'Gym',
    category: 'membership',
    expiresOn: null,
    folderId: null,
    pinned: true,
    position: 0,
    hasBack: false,
    frontAspect: 1.586,
    backAspect: null,
    createdAt: 1_000,
    updatedAt: 1_000,
    ...overrides,
  };
}

export function fields(overrides: Partial<CardFields> = {}): CardFields {
  return { name: 'Gym', category: 'membership', expiresOn: null, folderId: null, ...overrides };
}

// Fake "JPEGs": readable markers so tests can check what came back and that nothing leaks.
export function image(marker: string, aspect = 1.586): CardImage {
  return { jpegBase64: base64.encode(utf8.encode(`JPEG:${marker}`)), aspect };
}

export function frontImage(marker: string, aspect = 1.586): FrontImage {
  return { ...image(marker, aspect), thumbJpegBase64: base64.encode(utf8.encode(`THUMB:${marker}`)) };
}

export function images(marker: string, withBack = false): NewCardImages {
  return { front: frontImage(marker), back: withBack ? image(`${marker}-back`) : null };
}

export function importEntry(id: string, overrides: Partial<Card> = {}, withBack = false): ImportEntry {
  return {
    card: makeCard({ id, ...overrides, hasBack: withBack, backAspect: withBack ? 1.586 : null }),
    images: images(id, withBack),
  };
}

export function backupSnapshot(): BackupSnapshot {
  return {
    formatVersion: 1,
    exportedAt: 1_700_000_000_000,
    cards: [
      importEntry('card1', { name: 'Emirates ID', category: 'id', expiresOn: '2027-03-01' }),
      importEntry('card2', { name: 'Gym', pinned: false, position: 0 }, true),
    ],
    folders: [],
  };
}

export async function makeStore() {
  const db = memoryDb();
  await migrate(db);
  const blobs = createMemoryBlobStore();
  let clock = 1_000_000;
  let nextId = 0;
  const store = createCardStore({
    db,
    blobs,
    aead: createAead(generateKey()),
    now: () => (clock += 1_000),
    newId: () => `card${++nextId}`,
  });
  return { db, blobs, store };
}

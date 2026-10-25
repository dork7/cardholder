import { Aead } from '../crypto/aead';
import { base64, toHex, utf8 } from '../crypto/bytes';
import { engine } from '../crypto/engine';
import { BlobStore } from '../storage/blobStore';
import { SqlDb } from '../storage/sqlDb';
import { sortCards } from './listing';
import { Card, CardFields, ImageChanges, ImageSide, NewCardImages, toCategory } from './types';

export class CardNotFoundError extends Error {
  constructor(id: string) {
    super(`Card ${id} not found`);
    this.name = 'CardNotFoundError';
  }
}

export interface ImportEntry {
  card: Card;
  images: NewCardImages;
}

export interface CardStore {
  list(): Promise<Card[]>;
  ids(): Promise<string[]>;
  get(id: string): Promise<Card | null>;
  count(): Promise<number>;
  lastChangeAt(): Promise<number | null>;
  loadImage(id: string, side: ImageSide): Promise<string | null>;
  create(fields: CardFields, images: NewCardImages): Promise<Card>;
  update(id: string, fields: CardFields, changes?: ImageChanges): Promise<Card>;
  remove(id: string): Promise<void>;
  setPinned(id: string, pinned: boolean): Promise<void>;
  reorderPinned(orderedIds: string[]): Promise<void>;
  insertMany(entries: ImportEntry[], options: { replace: boolean }): Promise<void>;
}

export interface CardStoreDeps {
  db: SqlDb;
  blobs: BlobStore;
  aead: Aead;
  now?: () => number;
  newId?: () => string;
}

interface Row {
  id: string;
  pinned: number;
  position: number;
  payload: Uint8Array;
  created_at: number;
  updated_at: number;
}

// Everything about a card except what SQL needs for ordering is sealed in the payload.
type Payload = Omit<Card, 'id' | 'pinned' | 'position' | 'createdAt' | 'updatedAt'>;

const SIDES: ImageSide[] = ['front', 'back', 'thumb'];
const INSERT_SQL =
  'INSERT INTO cards (id, pinned, position, payload, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)';

export const blobName = (id: string, side: ImageSide) => `${id}.${side}`;

export function createCardStore({
  db,
  blobs,
  aead,
  now = Date.now,
  newId = () => toHex(engine.randomBytes(16)),
}: CardStoreDeps): CardStore {
  const seal = (card: Card): Uint8Array => {
    const payload: Payload = {
      name: card.name,
      category: card.category,
      expiresOn: card.expiresOn,
      tags: card.tags,
      documentKey: card.documentKey,
      hasBack: card.hasBack,
      frontAspect: card.frontAspect,
      backAspect: card.backAspect,
    };
    return aead.seal(utf8.encode(JSON.stringify(payload)));
  };

  const toCard = (row: Row): Card => {
    const payload = JSON.parse(utf8.decode(aead.open(row.payload))) as Payload;
    // Built field by field: older payloads can still hold a card number and notes, and a retired category.
    return {
      name: payload.name,
      category: toCategory(payload.category) ?? 'other',
      expiresOn: payload.expiresOn,
      tags: Array.isArray(payload.tags) ? payload.tags : [], // cards saved before tags have none
      documentKey: payload.documentKey ?? null,
      hasBack: payload.hasBack,
      frontAspect: payload.frontAspect,
      backAspect: payload.backAspect,
      id: row.id,
      pinned: row.pinned === 1,
      position: row.position,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  };

  const getRow = (id: string) => db.getFirstAsync<Row>('SELECT * FROM cards WHERE id = ?', [id]);

  const putImage = (id: string, side: ImageSide, jpegBase64: string) =>
    blobs.put(blobName(id, side), aead.seal(base64.decode(jpegBase64)));

  const removeImages = async (id: string) => {
    for (const side of SIDES) await blobs.remove(blobName(id, side));
  };

  const writeImages = async (id: string, images: NewCardImages) => {
    await putImage(id, 'front', images.front.jpegBase64);
    await putImage(id, 'thumb', images.front.thumbJpegBase64);
    if (images.back) await putImage(id, 'back', images.back.jpegBase64);
    else await blobs.remove(blobName(id, 'back'));
  };

  const nextPinnedPosition = async () =>
    (
      await db.getFirstAsync<{ next: number }>(
        'SELECT COALESCE(MAX(position), -1) + 1 AS next FROM cards WHERE pinned = 1',
        [],
      )
    )?.next ?? 0;

  const ids = async () => (await db.getAllAsync<{ id: string }>('SELECT id FROM cards', [])).map((r) => r.id);

  return {
    async list() {
      const rows = await db.getAllAsync<Row>('SELECT * FROM cards', []);
      const cards: Card[] = [];
      for (const row of rows) {
        try {
          cards.push(toCard(row));
        } catch {
          console.warn(`Skipping unreadable card ${row.id}`);
        }
      }
      return sortCards(cards);
    },

    ids,

    async get(id) {
      const row = await getRow(id);
      return row ? toCard(row) : null;
    },

    async count() {
      return (await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM cards', []))?.n ?? 0;
    },

    async lastChangeAt() {
      return (await db.getFirstAsync<{ t: number | null }>('SELECT MAX(updated_at) AS t FROM cards', []))?.t ?? null;
    },

    async loadImage(id, side) {
      const sealed = await blobs.get(blobName(id, side));
      return sealed ? base64.encode(aead.open(sealed)) : null;
    },

    async create(fields, images) {
      const id = newId();
      const t = now();
      await writeImages(id, images);
      const card: Card = {
        ...fields,
        id,
        // Pinning is the user's choice; a new card joins the unpinned, alphabetical rest.
        pinned: false,
        position: 0,
        hasBack: images.back !== null,
        frontAspect: images.front.aspect,
        backAspect: images.back?.aspect ?? null,
        createdAt: t,
        updatedAt: t,
      };
      await db.runAsync(INSERT_SQL, [card.id, 0, card.position, seal(card), t, t]);
      return card;
    },

    async update(id, fields, changes = {}) {
      const row = await getRow(id);
      if (!row) throw new CardNotFoundError(id);
      const current = toCard(row);
      if (changes.front) {
        await putImage(id, 'front', changes.front.jpegBase64);
        await putImage(id, 'thumb', changes.front.thumbJpegBase64);
      }
      if (changes.back) await putImage(id, 'back', changes.back.jpegBase64);
      else if (changes.back === null) await blobs.remove(blobName(id, 'back'));

      const backChanged = changes.back !== undefined;
      const next: Card = {
        ...current,
        ...fields,
        frontAspect: changes.front?.aspect ?? current.frontAspect,
        hasBack: backChanged ? changes.back !== null : current.hasBack,
        backAspect: backChanged ? (changes.back?.aspect ?? null) : current.backAspect,
        // Strictly increasing so image caches keyed on updatedAt never serve a stale picture.
        updatedAt: Math.max(now(), current.updatedAt + 1),
      };
      await db.runAsync('UPDATE cards SET payload = ?, updated_at = ? WHERE id = ?', [seal(next), next.updatedAt, id]);
      return next;
    },

    async remove(id) {
      await db.runAsync('DELETE FROM cards WHERE id = ?', [id]);
      await removeImages(id);
    },

    async setPinned(id, pinned) {
      const row = await getRow(id);
      if (!row) throw new CardNotFoundError(id);
      if ((row.pinned === 1) === pinned) return;
      const position = pinned ? await nextPinnedPosition() : 0;
      await db.runAsync('UPDATE cards SET pinned = ?, position = ? WHERE id = ?', [pinned ? 1 : 0, position, id]);
    },

    async reorderPinned(orderedIds) {
      await db.withTransactionAsync(async () => {
        for (const [index, id] of orderedIds.entries()) {
          await db.runAsync('UPDATE cards SET position = ? WHERE id = ? AND pinned = 1', [index, id]);
        }
      });
    },

    async insertMany(entries, { replace }) {
      const existingBefore = new Set(await ids());
      const previousIds = replace ? [...existingBefore] : [];
      const newBlobIds: string[] = [];

      try {
        for (const { card, images } of entries) {
          if (!existingBefore.has(card.id)) {
            newBlobIds.push(card.id);
            await writeImages(card.id, images);
          }
        }

        let position = replace ? 0 : await nextPinnedPosition();
        const pinnedInOrder = entries.filter((e) => e.card.pinned).sort((a, b) => a.card.position - b.card.position);
        const positions = new Map(pinnedInOrder.map((e) => [e.card.id, position++] as const));

        await db.withTransactionAsync(async () => {
          if (replace) await db.runAsync('DELETE FROM cards', []);
          for (const { card } of entries) {
            const stored: Card = { ...card, position: positions.get(card.id) ?? 0 };
            await db.runAsync(INSERT_SQL, [
              stored.id,
              stored.pinned ? 1 : 0,
              stored.position,
              seal(stored),
              stored.createdAt,
              stored.updatedAt,
            ]);
          }
        });
      } catch (e) {
        for (const id of newBlobIds) await removeImages(id);
        throw e;
      }

      for (const { card, images } of entries) {
        if (existingBefore.has(card.id)) await writeImages(card.id, images);
      }

      if (replace) {
        const kept = new Set(entries.map((e) => e.card.id));
        for (const id of previousIds) if (!kept.has(id)) await removeImages(id);
      }
    },
  };
}

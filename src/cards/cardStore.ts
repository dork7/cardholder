import { Aead } from '../crypto/aead';
import { base64, toHex, utf8 } from '../crypto/bytes';
import { engine } from '../crypto/engine';
import { BlobStore } from '../storage/blobStore';
import { SqlDb } from '../storage/sqlDb';
import { sortCards } from './listing';
import { Card, CardCategory, CardFields, CardPdf, CATEGORIES, Folder, ImageChanges, ImageSide, NewCardImages, PdfDocument, toCategory } from './types';

export class FolderNotFoundError extends Error {
  constructor(id: string) {
    super(`Folder ${id} not found`);
    this.name = 'FolderNotFoundError';
  }
}

// Deleting a category some cards still use; `cards` are those cards.
export class CategoryInUseError extends Error {
  constructor(public readonly cards: Card[]) {
    super(`Category is used by ${cards.length} card(s)`);
    this.name = 'CategoryInUseError';
  }
}

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
  loadPdf(id: string): Promise<string | null>; // base64
  create(fields: CardFields, images: NewCardImages): Promise<Card>;
  update(id: string, fields: CardFields, changes?: ImageChanges): Promise<Card>;
  remove(id: string): Promise<void>;
  setPinned(id: string, pinned: boolean): Promise<void>;
  reorderPinned(orderedIds: string[]): Promise<void>;
  // Folders given here are written with the cards; ones already on the phone keep their name.
  insertMany(entries: ImportEntry[], options: { replace: boolean; folders?: Folder[] }): Promise<void>;
  listFolders(): Promise<Folder[]>;
  createFolder(name: string): Promise<Folder>;
  renameFolder(id: string, name: string): Promise<Folder>;
  // Its cards stay, outside any folder.
  removeFolder(id: string): Promise<void>;
  // The saved category list, in the order categories were added; the built-ins until it is changed.
  listCategories(): Promise<CardCategory[]>;
  addCategory(category: CardCategory): Promise<void>;
  // Fails with CategoryInUseError while any card still uses it.
  removeCategory(category: CardCategory): Promise<void>;
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
  folder_id: string | null;
  payload: Uint8Array;
  created_at: number;
  updated_at: number;
}

interface FolderRow {
  id: string;
  payload: Uint8Array;
  created_at: number;
}

// Everything about a card except what SQL needs for ordering is sealed in the payload.
type Payload = Omit<Card, 'id' | 'pinned' | 'position' | 'folderId' | 'createdAt' | 'updatedAt'>;

type BlobKind = ImageSide | 'pdf';
const KINDS: BlobKind[] = ['front', 'back', 'thumb', 'pdf'];
const INSERT_SQL =
  'INSERT INTO cards (id, pinned, position, folder_id, payload, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)';
const INSERT_FOLDER_SQL = 'INSERT INTO folders (id, payload, created_at) VALUES (?, ?, ?)';
// Sealed like a folder's name, in the settings table: the user's own category names are theirs to keep private.
const CATEGORIES_KEY = 'categories';

export const blobName = (id: string, kind: BlobKind) => `${id}.${kind}`;

const pdfInfo = (pdf: PdfDocument | null | undefined): CardPdf | null =>
  pdf ? { pageCount: pdf.pageCount, coverPage: pdf.coverPage } : null;

// Payloads sealed before PDF cards have no `pdf`.
const isCardPdf = (v: unknown): v is CardPdf =>
  typeof v === 'object' &&
  v !== null &&
  Number.isInteger((v as CardPdf).pageCount) &&
  Number.isInteger((v as CardPdf).coverPage);

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
      pdf: card.pdf,
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
      pdf: isCardPdf(payload.pdf) ? payload.pdf : null,
      id: row.id,
      pinned: row.pinned === 1,
      position: row.position,
      folderId: row.folder_id ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  };

  const sealFolder = (folder: Folder) => aead.seal(utf8.encode(JSON.stringify({ name: folder.name })));
  const toFolder = (row: FolderRow): Folder => ({
    id: row.id,
    name: (JSON.parse(utf8.decode(aead.open(row.payload))) as { name: string }).name,
    createdAt: row.created_at,
  });
  const folderName = (name: string) => name.trim();

  const readCategories = async (): Promise<CardCategory[]> => {
    const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [CATEGORIES_KEY]);
    if (!row) return [...CATEGORIES];
    const list = JSON.parse(utf8.decode(aead.open(base64.decode(row.value)))) as unknown;
    return Array.isArray(list) ? list.filter((c): c is string => typeof c === 'string') : [...CATEGORIES];
  };
  const writeCategories = (list: CardCategory[]) =>
    db.runAsync(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      [CATEGORIES_KEY, base64.encode(aead.seal(utf8.encode(JSON.stringify(list))))],
    );

  const getRow = (id: string) => db.getFirstAsync<Row>('SELECT * FROM cards WHERE id = ?', [id]);

  const putImage = (id: string, kind: BlobKind, base64Data: string) =>
    blobs.put(blobName(id, kind), aead.seal(base64.decode(base64Data)));

  const removeImages = async (id: string) => {
    for (const kind of KINDS) await blobs.remove(blobName(id, kind));
  };

  const load = async (id: string, kind: BlobKind) => {
    const sealed = await blobs.get(blobName(id, kind));
    return sealed ? base64.encode(aead.open(sealed)) : null;
  };

  const writeImages = async (id: string, images: NewCardImages) => {
    await putImage(id, 'front', images.front.jpegBase64);
    await putImage(id, 'thumb', images.front.thumbJpegBase64);
    if (images.back) await putImage(id, 'back', images.back.jpegBase64);
    else await blobs.remove(blobName(id, 'back'));
    if (images.pdf) await putImage(id, 'pdf', images.pdf.pdfBase64);
    else await blobs.remove(blobName(id, 'pdf'));
  };

  const nextPinnedPosition = async () =>
    (
      await db.getFirstAsync<{ next: number }>(
        'SELECT COALESCE(MAX(position), -1) + 1 AS next FROM cards WHERE pinned = 1',
        [],
      )
    )?.next ?? 0;

  const listCards = async () => {
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
  };

  const ids = async () => (await db.getAllAsync<{ id: string }>('SELECT id FROM cards', [])).map((r) => r.id);

  return {
    list: listCards,

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

    loadImage: load,

    loadPdf: (id) => load(id, 'pdf'),

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
        pdf: pdfInfo(images.pdf),
        createdAt: t,
        updatedAt: t,
      };
      await db.runAsync(INSERT_SQL, [card.id, 0, card.position, card.folderId, seal(card), t, t]);
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
      if (changes.pdf) await putImage(id, 'pdf', changes.pdf.pdfBase64);
      else if (changes.pdf === null) await blobs.remove(blobName(id, 'pdf'));

      const backChanged = changes.back !== undefined;
      const next: Card = {
        ...current,
        ...fields,
        frontAspect: changes.front?.aspect ?? current.frontAspect,
        hasBack: backChanged ? changes.back !== null : current.hasBack,
        backAspect: backChanged ? (changes.back?.aspect ?? null) : current.backAspect,
        pdf: changes.pdf !== undefined ? pdfInfo(changes.pdf) : current.pdf,
        // Strictly increasing so image caches keyed on updatedAt never serve a stale picture.
        updatedAt: Math.max(now(), current.updatedAt + 1),
      };
      await db.runAsync('UPDATE cards SET folder_id = ?, payload = ?, updated_at = ? WHERE id = ?', [
        next.folderId,
        seal(next),
        next.updatedAt,
        id,
      ]);
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

    async insertMany(entries, { replace, folders = [] }) {
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
          if (replace) {
            await db.runAsync('DELETE FROM cards', []);
            await db.runAsync('DELETE FROM folders', []);
          }
          for (const folder of folders) {
            const exists = await db.getFirstAsync('SELECT id FROM folders WHERE id = ?', [folder.id]);
            if (!exists) await db.runAsync(INSERT_FOLDER_SQL, [folder.id, sealFolder(folder), folder.createdAt]);
          }
          for (const { card } of entries) {
            const stored: Card = { ...card, position: positions.get(card.id) ?? 0 };
            await db.runAsync(INSERT_SQL, [
              stored.id,
              stored.pinned ? 1 : 0,
              stored.position,
              stored.folderId,
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

    async listFolders() {
      const rows = await db.getAllAsync<FolderRow>('SELECT * FROM folders', []);
      const folders: Folder[] = [];
      for (const row of rows) {
        try {
          folders.push(toFolder(row));
        } catch {
          console.warn(`Skipping unreadable folder ${row.id}`);
        }
      }
      return folders.sort(
        (a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }) || a.id.localeCompare(b.id),
      );
    },

    async createFolder(name) {
      const folder: Folder = { id: newId(), name: folderName(name), createdAt: now() };
      await db.runAsync(INSERT_FOLDER_SQL, [folder.id, sealFolder(folder), folder.createdAt]);
      return folder;
    },

    async renameFolder(id, name) {
      const row = await db.getFirstAsync<FolderRow>('SELECT * FROM folders WHERE id = ?', [id]);
      if (!row) throw new FolderNotFoundError(id);
      const folder = { ...toFolder(row), name: folderName(name) };
      await db.runAsync('UPDATE folders SET payload = ? WHERE id = ?', [sealFolder(folder), id]);
      return folder;
    },

    listCategories: readCategories,

    async addCategory(category) {
      const list = await readCategories();
      if (!list.includes(category)) await writeCategories([...list, category]);
    },

    async removeCategory(category) {
      const users = (await listCards()).filter((card) => card.category === category);
      if (users.length > 0) throw new CategoryInUseError(users);
      await writeCategories((await readCategories()).filter((c) => c !== category));
    },

    async removeFolder(id) {
      await db.withTransactionAsync(async () => {
        await db.runAsync('UPDATE cards SET folder_id = NULL WHERE folder_id = ?', [id]);
        await db.runAsync('DELETE FROM folders WHERE id = ?', [id]);
      });
    },
  };
}

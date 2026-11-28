import { importNotes, Note, queueNoteWrite, unlinkNotesFromDocument } from '../notes/noteStore';
import { Aead } from '../crypto/aead';
import { base64, toHex, utf8 } from '../crypto/bytes';
import { engine } from '../crypto/engine';
import { BlobStore } from '../storage/blobStore';
import { SqlDb, SqlValue } from '../storage/sqlDb';
import { sortCards } from './listing';
import { DAY_MS, DEFAULT_REMIND_DAYS, RECENTLY_DELETED_DAYS } from '../config';
import { parseRemindDays, toCardText } from './validate';
import { normalizeTags, sameTag, withLegacyCategory } from './tags';
import { spaceFor } from '../spaces/spaces';
import { personName, samePersonName } from '../people/names';
import { toProfile } from '../profiles/profile';
import { Card, CardFields, CardPdf, DeletedCard, Folder, ImageChanges, ImageSide, looksVertical, NewCardImages, PdfDocument, Person } from './types';

export class FolderNotFoundError extends Error {
  constructor(id: string) {
    super(`Folder ${id} not found`);
    this.name = 'FolderNotFoundError';
  }
}

export class CardNotFoundError extends Error {
  constructor(id: string) {
    super(`Card ${id} not found`);
    this.name = 'CardNotFoundError';
  }
}

// A Person has at most one profile, and a profile always belongs to one.
export class ProfileExistsError extends Error {
  constructor(personId: string) {
    super(`Person ${personId} already has a profile`);
    this.name = 'ProfileExistsError';
  }
}

export interface ImportEntry {
  card: Card;
  images: NewCardImages;
}

export interface CardStore {
  list(): Promise<Card[]>;
  // Every id in use, Recently deleted included, so an import never reuses one.
  ids(): Promise<string[]>;
  get(id: string): Promise<Card | null>;
  count(): Promise<number>;
  lastChangeAt(): Promise<number | null>;
  loadImage(id: string, side: ImageSide): Promise<string | null>;
  loadPdf(id: string): Promise<string | null>; // base64
  create(fields: CardFields, images: NewCardImages): Promise<Card>;
  update(id: string, fields: CardFields, changes?: ImageChanges): Promise<Card>;
  // Every delete moves the document to Recently deleted; it stays sealed, photos and all, until it is
  // restored or erased. Only current documents are listed, counted or fetched by `get`.
  moveToRecentlyDeleted(id: string): Promise<void>;
  // Most recently deleted first.
  listRecentlyDeleted(): Promise<DeletedCard[]>;
  // Back exactly as it was: pin, folder, tags, photos or PDF.
  restore(id: string): Promise<void>;
  // Takes a deleted tag off documents in Recently deleted too, so a restore can't bring it back (#97).
  // Returns how many documents changed.
  removeTagFromRecentlyDeleted(tag: string): Promise<number>;
  // Erases one document in Recently deleted, and its photos or PDF, for good.
  erase(id: string): Promise<void>;
  // Erases everything in Recently deleted.
  eraseRecentlyDeleted(): Promise<void>;
  // Erases what has been in Recently deleted for RECENTLY_DELETED_DAYS or more; returns how many.
  purgeRecentlyDeleted(): Promise<number>;
  setPinned(id: string, pinned: boolean): Promise<void>;
  reorderPinned(orderedIds: string[]): Promise<void>;
  migrateFoldersToTags(): Promise<void>;
  // Folders given here are written with the cards; ones already on the phone keep their name.
  insertMany(entries: ImportEntry[], options: { replace: boolean; folders?: Folder[]; people?: Person[]; notes?: Note[]; notesBackedUpAt?: number }): Promise<void>;
  listFolders(): Promise<Folder[]>;
  createFolder(name: string): Promise<Folder>;
  renameFolder(id: string, name: string): Promise<Folder>;
  // Its cards stay, outside any folder.
  removeFolder(id: string): Promise<void>;
  listPeople(): Promise<Person[]>;
  createPerson(name: string): Promise<Person>;
  renamePerson(id: string, name: string): Promise<Person>;
  removePerson(id: string): Promise<void>;
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
  person_id: string | null;
  payload: Uint8Array;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

interface FolderRow {
  id: string;
  payload: Uint8Array;
  created_at: number;
}

// Everything about a card except what SQL needs for ordering is sealed in the payload.
type Payload = Omit<Card, 'id' | 'pinned' | 'position' | 'folderId' | 'personId' | 'createdAt' | 'updatedAt'>;

type BlobKind = ImageSide | 'pdf';
const KINDS: BlobKind[] = ['front', 'back', 'thumb', 'pdf', 'profilePhoto'];
const INSERT_SQL =
  'INSERT INTO cards (id, pinned, position, folder_id, person_id, payload, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
const CURRENT = 'deleted_at IS NULL';
const INSERT_FOLDER_SQL = 'INSERT INTO folders (id, payload, created_at) VALUES (?, ?, ?)';
const INSERT_PERSON_SQL = 'INSERT INTO people (id, payload, created_at) VALUES (?, ?, ?)';

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
      ...(card.spaceId !== undefined && { spaceId: spaceFor(card.spaceId).id }),
      expiresOn: card.expiresOn,
      remindDaysBefore: card.remindDaysBefore,
      tags: card.tags,
      documentKey: card.documentKey,
      hasBack: card.hasBack,
      frontAspect: card.frontAspect,
      backAspect: card.backAspect,
      pdf: card.pdf,
      readText: card.readText,
      vertical: card.vertical,
      blurPreview: card.blurPreview,
      ...(card.profile && { profile: card.profile }),
    };
    return aead.seal(utf8.encode(JSON.stringify(payload)));
  };

  const toCard = (row: Row): Card => {
    const payload = JSON.parse(utf8.decode(aead.open(row.payload))) as Payload;
    const profile = toProfile(payload.profile);
    // Built field by field: older payloads can still hold a card number and notes, and a category
    // from before categories became tags, which is read as the card's first tag.
    return {
      name: payload.name,
      ...(payload.spaceId !== undefined && { spaceId: spaceFor(payload.spaceId).id }),
      expiresOn: profile ? null : payload.expiresOn,
      remindDaysBefore: parseRemindDays(payload.remindDaysBefore) ?? DEFAULT_REMIND_DAYS, // cards saved before the setting
      tags: withLegacyCategory(Array.isArray(payload.tags) ? payload.tags : [], (payload as { category?: unknown }).category), // cards saved before tags have none
      documentKey: payload.documentKey ?? null,
      hasBack: payload.hasBack,
      frontAspect: payload.frontAspect,
      backAspect: payload.backAspect,
      pdf: isCardPdf(payload.pdf) ? payload.pdf : null,
      readText: toCardText(payload.readText), // null for cards saved before text was kept
      blurPreview: payload.blurPreview === true,
      vertical: typeof payload.vertical === 'boolean' ? payload.vertical : looksVertical(payload.frontAspect),
      ...(profile && { profile }),
      id: row.id,
      pinned: row.pinned === 1,
      position: row.position,
      folderId: row.folder_id ?? null,
      personId: row.person_id ?? null,
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
  const markDocumentsChanged = () => db.runAsync("INSERT INTO settings (key, value) VALUES ('documentsChangedAt', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [String(now())]);
  const sealPerson = (person: Person) => aead.seal(utf8.encode(JSON.stringify({ name: person.name })));
  const toPerson = (row: FolderRow): Person => ({ id: row.id, name: (JSON.parse(utf8.decode(aead.open(row.payload))) as { name: string }).name, createdAt: row.created_at });

  const getRow = (id: string) => db.getFirstAsync<Row>(`SELECT * FROM cards WHERE id = ? AND ${CURRENT}`, [id]);

  // A profile needs a person who has no other current profile. Only that person's documents are opened.
  const checkProfileOwner = async (fields: CardFields, id: string | null) => {
    if (!fields.profile) return;
    if (!fields.personId) throw new Error('A profile needs a person');
    const rows = await db.getAllAsync<Row>(`SELECT * FROM cards WHERE person_id = ? AND ${CURRENT}`, [fields.personId]);
    if (rows.some((row) => row.id !== id && toCard(row).profile)) throw new ProfileExistsError(fields.personId);
  };

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
    if (images.profilePhoto) await putImage(id, 'profilePhoto', images.profilePhoto.jpegBase64);
    else await blobs.remove(blobName(id, 'profilePhoto'));
  };

  const nextPinnedPosition = async () =>
    (
      await db.getFirstAsync<{ next: number }>(
        'SELECT COALESCE(MAX(position), -1) + 1 AS next FROM cards WHERE pinned = 1',
        [],
      )
    )?.next ?? 0;

  const readRows = async <T,>(sql: string, params: SqlValue[], read: (row: Row) => T): Promise<T[]> => {
    const out: T[] = [];
    for (const row of await db.getAllAsync<Row>(sql, params)) {
      try {
        out.push(read(row));
      } catch {
        console.warn(`Skipping unreadable card ${row.id}`);
      }
    }
    return out;
  };

  const listCards = async () => sortCards(await readRows(`SELECT * FROM cards WHERE ${CURRENT}`, [], toCard));

  const eraseWhere = async (where: string, params: SqlValue[]) => {
    const rows = await db.getAllAsync<{ id: string }>(`SELECT id FROM cards WHERE ${where}`, params);
    for (const { id } of rows) {
      await db.runAsync('DELETE FROM document_visits WHERE id = ?', [id]);
      await db.runAsync('DELETE FROM cards WHERE id = ?', [id]);
      await removeImages(id);
    }
    return rows.length;
  };

  const ids = async () => (await db.getAllAsync<{ id: string }>('SELECT id FROM cards', [])).map((r) => r.id);
  const listPeople = async (): Promise<Person[]> => {
    const rows = await db.getAllAsync<FolderRow>('SELECT * FROM people', []);
    return rows.map(toPerson).sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }) || a.id.localeCompare(b.id));
  };

  return {
    list: listCards,

    ids,

    async get(id) {
      const row = await getRow(id);
      return row ? toCard(row) : null;
    },

    async count() {
      return (await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM cards WHERE ${CURRENT}`, []))?.n ?? 0;
    },

    async lastChangeAt() {
      return (await db.getFirstAsync<{ t: number | null }>("SELECT MAX(t) AS t FROM (SELECT MAX(updated_at) AS t FROM cards UNION ALL SELECT CAST(value AS INTEGER) AS t FROM settings WHERE key = 'documentsChangedAt')", []))?.t ?? null;
    },

    loadImage: load,

    loadPdf: (id) => load(id, 'pdf'),

    async create(fields, images) {
      await checkProfileOwner(fields, null);
      const id = newId();
      const t = now();
      await writeImages(id, images);
      const card: Card = {
        ...fields,
        expiresOn: fields.profile ? null : fields.expiresOn,
        id,
        pinned: false,
        position: 0,
        hasBack: images.back !== null,
        frontAspect: images.front.aspect,
        backAspect: images.back?.aspect ?? null,
        pdf: pdfInfo(images.pdf),
        createdAt: t,
        updatedAt: t,
      };
      await db.runAsync(INSERT_SQL, [card.id, card.pinned ? 1 : 0, card.position, card.folderId, card.personId, seal(card), t, t]);
      return card;
    },

    update: (id, fields, changes = {}) => queueNoteWrite(db, async () => {
      const row = await getRow(id);
      if (!row) throw new CardNotFoundError(id);
      const current = toCard(row);
      await checkProfileOwner({ ...current, ...fields, profile: fields.profile ?? current.profile }, id);
      if (changes.front) {
        await putImage(id, 'front', changes.front.jpegBase64);
        await putImage(id, 'thumb', changes.front.thumbJpegBase64);
      }
      if (changes.back) await putImage(id, 'back', changes.back.jpegBase64);
      else if (changes.back === null) await blobs.remove(blobName(id, 'back'));
      if (changes.pdf) await putImage(id, 'pdf', changes.pdf.pdfBase64);
      else if (changes.pdf === null) await blobs.remove(blobName(id, 'pdf'));
      if (changes.profilePhoto) await putImage(id, 'profilePhoto', changes.profilePhoto.jpegBase64);
      else if (changes.profilePhoto === null) await blobs.remove(blobName(id, 'profilePhoto'));

      const backChanged = changes.back !== undefined;
      const { spaceId, ...updates } = fields;
      const next: Card = {
        ...current,
        ...updates,
        expiresOn: (updates.profile ?? current.profile) ? null : updates.expiresOn,
        ...(spaceId !== undefined && { spaceId }),
        frontAspect: changes.front?.aspect ?? current.frontAspect,
        hasBack: backChanged ? changes.back !== null : current.hasBack,
        backAspect: backChanged ? (changes.back?.aspect ?? null) : current.backAspect,
        pdf: changes.pdf !== undefined ? pdfInfo(changes.pdf) : current.pdf,
        // Strictly increasing so image caches keyed on updatedAt never serve a stale picture.
        updatedAt: Math.max(now(), current.updatedAt + 1),
      };
      await db.runAsync('UPDATE cards SET folder_id = ?, person_id = ?, payload = ?, updated_at = ? WHERE id = ?', [
        next.folderId,
        next.personId,
        seal(next),
        next.updatedAt,
        id,
      ]);
      return next;
    }),

    moveToRecentlyDeleted(id) {
      return queueNoteWrite(db, () => db.withTransactionAsync(async () => {
        const row = await getRow(id);
        if (!row || row.deleted_at !== null) return;
        const at = now();
        await db.runAsync(`UPDATE cards SET deleted_at = ? WHERE id = ? AND ${CURRENT}`, [at, id]);
        await unlinkNotesFromDocument(db, aead, id, at);
        await db.runAsync("INSERT INTO settings (key, value) VALUES ('documentsChangedAt', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [String(at)]);
      }));
    },

    listRecentlyDeleted: async () =>
      (
        await readRows('SELECT * FROM cards WHERE deleted_at IS NOT NULL', [], (row) => ({
          ...toCard(row),
          deletedAt: row.deleted_at!,
        }))
      ).sort((a, b) => b.deletedAt - a.deletedAt || a.id.localeCompare(b.id)),

    async restore(id) {
      await db.withTransactionAsync(async () => {
        const row = await db.getFirstAsync<Row>('SELECT * FROM cards WHERE id = ?', [id]);
        if (!row || row.deleted_at === null) return;
        const card = toCard(row);
        if (card.profile && card.personId) {
          const owner = await db.getFirstAsync<FolderRow>('SELECT * FROM people WHERE id = ?', [card.personId]);
          if (!owner) await db.runAsync(INSERT_PERSON_SQL, [card.personId, sealPerson({ id: card.personId, name: card.name, createdAt: card.createdAt }), card.createdAt]);
          await checkProfileOwner(card, id);
        }
        await db.runAsync('UPDATE cards SET deleted_at = NULL WHERE id = ? AND deleted_at IS NOT NULL', [id]);
        await db.runAsync("INSERT INTO settings (key, value) VALUES ('documentsChangedAt', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [String(now())]);
      });
    },

    removeTagFromRecentlyDeleted: (tag) => queueNoteWrite(db, async () => {
      let changed = 0;
      await db.withTransactionAsync(async () => {
        for (const row of await db.getAllAsync<Row>('SELECT * FROM cards WHERE deleted_at IS NOT NULL', [])) {
          const card = toCard(row);
          if (!card.tags.some((t) => sameTag(t, tag))) continue;
          await db.runAsync('UPDATE cards SET payload = ? WHERE id = ?', [seal({ ...card, tags: card.tags.filter((t) => !sameTag(t, tag)) }), card.id]);
          changed++;
        }
      });
      return changed;
    }),

    async erase(id) {
      await eraseWhere('id = ? AND deleted_at IS NOT NULL', [id]);
    },

    async eraseRecentlyDeleted() {
      await eraseWhere('deleted_at IS NOT NULL', []);
    },

    purgeRecentlyDeleted: () => eraseWhere('deleted_at <= ?', [now() - RECENTLY_DELETED_DAYS * DAY_MS]),

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

    async migrateFoldersToTags() {
      await db.withTransactionAsync(async () => {
        const folderRows = await db.getAllAsync<FolderRow>('SELECT * FROM folders', []);
        const folders = new Map(folderRows.map((row) => [row.id, toFolder(row).name]));
        const rows = await db.getAllAsync<Row>('SELECT * FROM cards WHERE folder_id IS NOT NULL', []);
        for (const row of rows) {
          const name = folders.get(row.folder_id!);
          if (!name) throw new Error(`Missing folder for document ${row.id}`);
          const card = toCard(row);
          const next = { ...card, tags: normalizeTags([...card.tags, name]), folderId: null };
          await db.runAsync('UPDATE cards SET folder_id = NULL, payload = ? WHERE id = ?', [seal(next), row.id]);
        }
        if (folderRows.length > 0) {
          await db.runAsync('DELETE FROM folders', []);
          await markDocumentsChanged();
        }
      });
    },

    async insertMany(entries, { replace, folders = [], people = [], notes, notesBackedUpAt }) {
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

        await queueNoteWrite(db, () => db.withTransactionAsync(async () => {
          if (replace) {
            await db.runAsync('DELETE FROM document_visits', []);
            await db.runAsync('DELETE FROM cards', []);
            await db.runAsync('DELETE FROM folders', []);
            await db.runAsync('DELETE FROM people', []);
          }
          for (const folder of folders) {
            const exists = await db.getFirstAsync('SELECT id FROM folders WHERE id = ?', [folder.id]);
            if (!exists) await db.runAsync(INSERT_FOLDER_SQL, [folder.id, sealFolder(folder), folder.createdAt]);
          }
          for (const person of people) {
            const exists = await db.getFirstAsync('SELECT id FROM people WHERE id = ?', [person.id]);
            if (!exists) await db.runAsync(INSERT_PERSON_SQL, [person.id, sealPerson(person), person.createdAt]);
          }
          if (notes !== undefined) await importNotes(db, aead, notes, replace, notesBackedUpAt, new Set(entries.map((entry) => entry.card.id)));
          for (const { card } of entries) {
            const stored: Card = { ...card, position: positions.get(card.id) ?? 0 };
            await db.runAsync(INSERT_SQL, [
              stored.id,
              stored.pinned ? 1 : 0,
              stored.position,
              stored.folderId,
              stored.personId,
              seal(stored),
              stored.createdAt,
              stored.updatedAt,
            ]);
          }
        }));
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

    async removeFolder(id) {
      await db.withTransactionAsync(async () => {
        await db.runAsync('UPDATE cards SET folder_id = NULL WHERE folder_id = ?', [id]);
        await db.runAsync('DELETE FROM folders WHERE id = ?', [id]);
      });
    },
    listPeople,
    async createPerson(name) {
      const trimmed = personName(name);
      if (!trimmed) throw new Error('Invalid person name');
      if ((await listPeople()).some((person) => samePersonName(person.name, trimmed))) throw new Error('Person already exists');
      const person = { id: newId(), name: trimmed, createdAt: now() };
      await db.withTransactionAsync(async () => {
        await db.runAsync(INSERT_PERSON_SQL, [person.id, sealPerson(person), person.createdAt]);
        await markDocumentsChanged();
      });
      return person;
    },
    async renamePerson(id, name) {
      const trimmed = personName(name);
      if (!trimmed) throw new Error('Invalid person name');
      if ((await listPeople()).some((person) => person.id !== id && samePersonName(person.name, trimmed))) throw new Error('Person already exists');
      const row = await db.getFirstAsync<FolderRow>('SELECT * FROM people WHERE id = ?', [id]);
      if (!row) throw new Error('Person not found');
      const person = { ...toPerson(row), name: trimmed };
      await db.withTransactionAsync(async () => {
        await db.runAsync('UPDATE people SET payload = ? WHERE id = ?', [sealPerson(person), id]);
        await markDocumentsChanged();
      });
      return person;
    },
    removePerson(id) {
      return queueNoteWrite(db, () => db.withTransactionAsync(async () => {
        const rows = await db.getAllAsync<Row>('SELECT * FROM cards WHERE person_id = ?', [id]);
        const at = now();
        for (const row of rows) {
          if (toCard(row).profile) {
            if (row.deleted_at === null) {
              await db.runAsync(`UPDATE cards SET deleted_at = ? WHERE id = ? AND ${CURRENT}`, [at, row.id]);
              await unlinkNotesFromDocument(db, aead, row.id, at);
            }
          } else {
            await db.runAsync('UPDATE cards SET person_id = NULL WHERE id = ?', [row.id]);
          }
        }
        await db.runAsync('DELETE FROM people WHERE id = ?', [id]);
        await markDocumentsChanged();
      }));
    },
  };
}

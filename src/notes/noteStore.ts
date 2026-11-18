import { Aead } from '../crypto/aead';
import { toHex, utf8 } from '../crypto/bytes';
import { engine } from '../crypto/engine';
import { SqlDb } from '../storage/sqlDb';
import { normalizeTags } from '../cards/tags';
import { MAX_TAGS, TAG_MAX_LENGTH } from '../config';

export interface NoteFields {
  title: string;
  body: string;
}

export interface Note extends NoteFields {
  id: string;
  pinned: boolean;
  reminderAt?: number; // Date and time, sealed with the content.
  tags: string[];
  documentId: string | null;
  createdAt: number;
  updatedAt: number; // Content edits only; pinning does not reorder peers.
}

export const isBlankNote = (fields: NoteFields) => !fields.title.trim() && !fields.body.trim();

export function findNotes(notes: readonly Note[], query = '', tag: string | null = null): Note[] {
  const needle = query.trim().toLowerCase();
  return notes.filter((note) => (!tag || note.tags.some((value) => value.toLocaleLowerCase() === tag.toLocaleLowerCase())) && (!needle || `${note.title}\n${note.body}`.toLowerCase().includes(needle))).sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
}

interface Row {
  id: string;
  pinned: number;
  created_at: number;
  updated_at: number;
  payload: Uint8Array;
}

export interface NoteStore {
  list(): Promise<Note[]>;
  get(id: string): Promise<Note | null>;
  save(id: string, fields: NoteFields): Promise<Note>;
  remove(id: string): Promise<void>;
  setPinned(id: string, pinned: boolean): Promise<void>;
  setReminder(id: string, at: number | null): Promise<void>;
  setTags(id: string, tags: string[]): Promise<void>;
  setDocument(id: string, documentId: string | null): Promise<void>;
  lastChangeAt(): Promise<number | null>;
  newId(): string;
}

const INSERT = 'INSERT INTO notes (id, pinned, payload, created_at, updated_at) VALUES (?, ?, ?, ?, ?)';
const seal = (aead: Aead, fields: NoteFields & { reminderAt?: number; tags?: string[]; documentId?: string | null }) => aead.seal(utf8.encode(JSON.stringify({ title: fields.title, body: fields.body, ...(fields.reminderAt !== undefined && { reminderAt: fields.reminderAt }), tags: fields.tags ?? [], documentId: fields.documentId ?? null })));

// Note editors and document deletion share this queue, so a late note save cannot restore a link
// after the document has been moved to Recently deleted.
const writeTails = new WeakMap<SqlDb, Promise<unknown>>();
export function queueNoteWrite<T>(db: SqlDb, run: () => Promise<T>): Promise<T> {
  const next = (writeTails.get(db) ?? Promise.resolve()).then(run);
  writeTails.set(db, next.catch(() => {}));
  return next;
}
const waitForWrites = (db: SqlDb) => writeTails.get(db) ?? Promise.resolve();

async function changed(db: SqlDb, at: number) {
  // A deletion must count as a change too, even if there are no notes left.
  await db.runAsync("INSERT OR REPLACE INTO settings (key, value) VALUES ('notesChangedAt', ?)", [String(at)]);
}

// Called inside the document import's transaction so notes and document rows commit together.
// When the notes left on the phone are exactly the backup's, they changed no later than the backup
// (backedUpAt), so Settings doesn't report the notes just restored as changed since that backup.
export async function importNotes(db: SqlDb, aead: Aead, notes: readonly Note[], replace: boolean, backedUpAt?: number, incomingCardIds: ReadonlySet<string> = new Set()) {
  const matchesBackup = replace || !(await db.getFirstAsync('SELECT id FROM notes LIMIT 1', []));
  if (replace) await db.runAsync('DELETE FROM notes', []);
  let inserted = 0;
  for (const note of notes) {
    if (await db.getFirstAsync('SELECT id FROM notes WHERE id = ?', [note.id])) continue;
    const linked = note.documentId && (incomingCardIds.has(note.documentId) || await db.getFirstAsync('SELECT id FROM cards WHERE id = ? AND deleted_at IS NULL', [note.documentId]));
    const safeNote = linked ? note : { ...note, documentId: null };
    await db.runAsync(INSERT, [note.id, note.pinned ? 1 : 0, seal(aead, safeNote), note.createdAt, note.updatedAt]);
    inserted++;
  }
  if (replace || inserted) await changed(db, matchesBackup && backedUpAt !== undefined ? backedUpAt : Date.now());
}

// A deleted document never leaves a dangling note link. Notes themselves remain available.
export async function unlinkNotesFromDocument(db: SqlDb, aead: Aead, documentId: string, at: number) {
  let changedAny = false;
  const rows = await db.getAllAsync<Row>('SELECT * FROM notes', []);
  for (const row of rows) {
    const fields = JSON.parse(utf8.decode(aead.open(row.payload))) as NoteFields & { documentId?: string | null };
    if (fields.documentId !== documentId) continue;
    await db.runAsync('UPDATE notes SET payload = ? WHERE id = ?', [seal(aead, { ...fields, documentId: null }), row.id]);
    changedAny = true;
  }
  if (changedAny) await changed(db, at);
}

export function createNoteStore({ db, aead, now = Date.now, newId = () => toHex(engine.randomBytes(16)) }: {
  db: SqlDb;
  aead: Aead;
  now?: () => number;
  newId?: () => string;
}): NoteStore {
  const decode = (row: Row): Note => {
    const fields = JSON.parse(utf8.decode(aead.open(row.payload))) as NoteFields & { reminderAt?: number; tags?: string[]; documentId?: string | null };
    return { ...(fields.reminderAt !== undefined && { reminderAt: fields.reminderAt }), id: row.id, title: fields.title, body: fields.body, tags: normalizeTags(Array.isArray(fields.tags) ? fields.tags : []), documentId: typeof fields.documentId === 'string' ? fields.documentId : null, pinned: row.pinned === 1, createdAt: row.created_at, updatedAt: row.updated_at };
  };
  const get = async (id: string) => {
    const row = await db.getFirstAsync<Row>('SELECT * FROM notes WHERE id = ?', [id]);
    return row ? decode(row) : null;
  };
  // Editors, pin actions and deletes share one queue: no old write can resurrect a deleted note.
  const write = <T>(run: () => Promise<T>): Promise<T> => queueNoteWrite(db, run);
  return {
    newId,
    get,
    async list() {
      await waitForWrites(db);
      const rows = await db.getAllAsync<Row>('SELECT * FROM notes', []);
      return findNotes(rows.map(decode));
    },
    save: (id, fields) => write(async () => {
      if (isBlankNote(fields)) throw new Error('Cannot save a blank note');
      const previous = await get(id);
      if (previous && previous.title === fields.title && previous.body === fields.body) return previous;
      const at = Math.max(now(), (previous?.updatedAt ?? 0) + 1);
      const note: Note = { ...fields, ...(previous?.reminderAt !== undefined && { reminderAt: previous.reminderAt }), tags: previous?.tags ?? [], documentId: previous?.documentId ?? null, id, pinned: previous?.pinned ?? false, createdAt: previous?.createdAt ?? at, updatedAt: at };
      await db.withTransactionAsync(async () => {
        if (previous) {
          await db.runAsync('UPDATE notes SET payload = ?, updated_at = ? WHERE id = ?', [seal(aead, note), at, id]);
        } else {
          await db.runAsync(INSERT, [id, 0, seal(aead, note), at, at]);
        }
        await changed(db, at);
      });
      return note;
    }),
    remove: (id) => write(async () => {
      if (!(await get(id))) return;
      await db.withTransactionAsync(async () => {
        await db.runAsync('DELETE FROM notes WHERE id = ?', [id]);
        await changed(db, now());
      });
    }),
    setPinned: (id, pinned) => write(async () => {
      const note = await get(id);
      if (!note) throw new Error('Note not found');
      if (note.pinned === pinned) return;
      await db.withTransactionAsync(async () => {
        await db.runAsync('UPDATE notes SET pinned = ? WHERE id = ?', [pinned ? 1 : 0, id]);
        await changed(db, now());
      });
    }),
    setReminder: (id, at) => write(async () => {
      if (at !== null && (!Number.isSafeInteger(at) || at <= 0 || at > 8.64e15)) throw new Error('Invalid reminder date');
      const note = await get(id);
      if (!note) throw new Error('Note not found');
      if (note.reminderAt === (at ?? undefined)) return;
      if (at === null) delete note.reminderAt;
      else note.reminderAt = at;
      await db.withTransactionAsync(async () => {
        await db.runAsync('UPDATE notes SET payload = ? WHERE id = ?', [seal(aead, note), id]);
        await changed(db, now());
      });
    }),
    setTags: (id, tags) => write(async () => {
      const normalized = normalizeTags(tags);
      if (normalized.length > MAX_TAGS || normalized.some((tag) => [...tag].length > TAG_MAX_LENGTH)) throw new Error('Invalid note tags');
      const note = await get(id);
      if (!note) throw new Error('Note not found');
      if (JSON.stringify(note.tags) === JSON.stringify(normalized)) return;
      await db.withTransactionAsync(async () => {
        await db.runAsync('UPDATE notes SET payload = ? WHERE id = ?', [seal(aead, { ...note, tags: normalized }), id]);
        await changed(db, now());
      });
    }),
    setDocument: (id, documentId) => write(async () => {
      if (documentId !== null && !(await db.getFirstAsync('SELECT id FROM cards WHERE id = ? AND deleted_at IS NULL', [documentId]))) throw new Error('Document not found');
      const note = await get(id);
      if (!note) throw new Error('Note not found');
      if (note.documentId === documentId) return;
      await db.withTransactionAsync(async () => {
        await db.runAsync('UPDATE notes SET payload = ? WHERE id = ?', [seal(aead, { ...note, documentId }), id]);
        await changed(db, now());
      });
    }),
    async lastChangeAt() {
      await waitForWrites(db);
      const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = 'notesChangedAt'", []);
      return row ? Number(row.value) : null;
    },
  };
}

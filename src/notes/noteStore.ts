import { Aead } from '../crypto/aead';
import { toHex, utf8 } from '../crypto/bytes';
import { engine } from '../crypto/engine';
import { SqlDb } from '../storage/sqlDb';

export interface NoteFields {
  title: string;
  body: string;
}

export interface Note extends NoteFields {
  id: string;
  pinned: boolean;
  createdAt: number;
  updatedAt: number; // Content edits only; pinning does not reorder peers.
}

export const isBlankNote = (fields: NoteFields) => !fields.title.trim() && !fields.body.trim();

export function findNotes(notes: readonly Note[], query = ''): Note[] {
  const needle = query.trim().toLowerCase();
  return notes.filter((note) => !needle || `${note.title}\n${note.body}`.toLowerCase().includes(needle)).sort(
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
  lastChangeAt(): Promise<number | null>;
  newId(): string;
}

const INSERT = 'INSERT INTO notes (id, pinned, payload, created_at, updated_at) VALUES (?, ?, ?, ?, ?)';
const seal = (aead: Aead, fields: NoteFields) => aead.seal(utf8.encode(JSON.stringify({ title: fields.title, body: fields.body })));

async function changed(db: SqlDb, at: number) {
  // A deletion must count as a change too, even if there are no notes left.
  await db.runAsync("INSERT OR REPLACE INTO settings (key, value) VALUES ('notesChangedAt', ?)", [String(at)]);
}

// Called inside the document import's transaction so notes and document rows commit together.
export async function importNotes(db: SqlDb, aead: Aead, notes: readonly Note[], replace: boolean) {
  if (replace) await db.runAsync('DELETE FROM notes', []);
  let inserted = 0;
  for (const note of notes) {
    if (await db.getFirstAsync('SELECT id FROM notes WHERE id = ?', [note.id])) continue;
    await db.runAsync(INSERT, [note.id, note.pinned ? 1 : 0, seal(aead, note), note.createdAt, note.updatedAt]);
    inserted++;
  }
  if (replace || inserted) await changed(db, Date.now());
}

export function createNoteStore({ db, aead, now = Date.now, newId = () => toHex(engine.randomBytes(16)) }: {
  db: SqlDb;
  aead: Aead;
  now?: () => number;
  newId?: () => string;
}): NoteStore {
  const decode = (row: Row): Note => {
    const fields = JSON.parse(utf8.decode(aead.open(row.payload))) as NoteFields;
    return { id: row.id, title: fields.title, body: fields.body, pinned: row.pinned === 1, createdAt: row.created_at, updatedAt: row.updated_at };
  };
  const get = async (id: string) => {
    const row = await db.getFirstAsync<Row>('SELECT * FROM notes WHERE id = ?', [id]);
    return row ? decode(row) : null;
  };
  // Editors, pin actions and deletes share one queue: no old write can resurrect a deleted note.
  let tail: Promise<unknown> = Promise.resolve();
  const write = <T>(run: () => Promise<T>): Promise<T> => {
    const next = tail.then(run);
    tail = next.catch(() => {});
    return next;
  };
  return {
    newId,
    get,
    async list() {
      await tail;
      const rows = await db.getAllAsync<Row>('SELECT * FROM notes', []);
      return findNotes(rows.map(decode));
    },
    save: (id, fields) => write(async () => {
      if (isBlankNote(fields)) throw new Error('Cannot save a blank note');
      const previous = await get(id);
      if (previous && previous.title === fields.title && previous.body === fields.body) return previous;
      const at = Math.max(now(), (previous?.updatedAt ?? 0) + 1);
      const note: Note = { ...fields, id, pinned: previous?.pinned ?? false, createdAt: previous?.createdAt ?? at, updatedAt: at };
      await db.withTransactionAsync(async () => {
        if (previous) {
          await db.runAsync('UPDATE notes SET payload = ?, updated_at = ? WHERE id = ?', [seal(aead, fields), at, id]);
        } else {
          await db.runAsync(INSERT, [id, 0, seal(aead, fields), at, at]);
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
    async lastChangeAt() {
      await tail;
      const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = 'notesChangedAt'", []);
      return row ? Number(row.value) : null;
    },
  };
}

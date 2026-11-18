import { fields, images, makeStore } from '../../../test/fixtures';
import { utf8 } from '../../crypto/bytes';
import { migrate } from '../../storage/sqlDb';
import { createNoteStore, findNotes } from '../noteStore';

test('notes keep exact text encrypted across reopening, independently of documents', async () => {
  const { db, aead, notes, store, blobs } = await makeStore();
  await store.create(fields(), images('doc'));
  const before = blobs.raw.size;
  const note = await notes.save(notes.newId(), { title: 'Private title', body: '  first\nsecond  ' });
  expect(note.pinned).toBe(false);
  const raw = await db.getFirstAsync<{ payload: Uint8Array }>('SELECT payload FROM notes', []);
  expect(Buffer.from(raw!.payload).toString()).not.toContain('Private title');
  expect(Buffer.from(raw!.payload).toString()).not.toContain('second');
  const reopened = createNoteStore({ db, aead });
  expect(await reopened.get(note.id)).toEqual(note);
  expect(await store.count()).toBe(1);
  expect(blobs.raw.size).toBe(before);
});

test('content edits order each pin group; pin changes preserve content timestamps', async () => {
  const { notes } = await makeStore();
  const first = await notes.save('a', { title: 'A', body: '' });
  await notes.save('b', { title: '', body: 'B' });
  expect((await notes.list()).map((n) => n.id)).toEqual(['b', 'a']);
  await notes.setPinned('a', true);
  expect((await notes.get('a'))!.updatedAt).toBe(first.updatedAt);
  expect((await notes.list()).map((n) => n.id)).toEqual(['a', 'b']);
  await notes.setPinned('b', true);
  expect((await notes.list()).map((n) => n.id)).toEqual(['b', 'a']);
  const edited = await notes.save('a', { title: 'A changed', body: '' });
  expect(edited.createdAt).toBe(first.createdAt);
  expect(edited.pinned).toBe(true);
  expect((await notes.list()).map((n) => n.id)).toEqual(['a', 'b']);
});

test('search finds titles and bodies ignoring case, with pinned-first ordering', async () => {
  const { notes } = await makeStore();
  await notes.save('a', { title: 'Renewal', body: '' });
  await notes.save('b', { title: '', body: 'Remember RENEWAL instructions' });
  await notes.save('c', { title: 'Unrelated', body: 'Something else' });
  await notes.setPinned('a', true);
  const all = await notes.list();
  expect(findNotes(all, ' renewal ').map((n) => n.id)).toEqual(['a', 'b']);
  expect(findNotes(all, '  ')).toEqual(all);
  expect(findNotes(all, 'missing')).toEqual([]);
});

test('deletion removes content and records a backup change even after the last note', async () => {
  const { notes } = await makeStore();
  await notes.save('a', { title: '', body: 'Private' });
  const before = await notes.lastChangeAt();
  await notes.remove('a');
  expect(await notes.get('a')).toBeNull();
  expect(await notes.list()).toEqual([]);
  expect(await notes.lastChangeAt()).toBeGreaterThan(before!);
});

test('blank notes cannot be persisted, and concurrent edits preserve the final text', async () => {
  const { notes } = await makeStore();
  await expect(notes.save('blank', { title: ' ', body: '\n' })).rejects.toThrow();
  await Promise.all([
    notes.save('a', { title: '', body: 'First' }),
    notes.save('a', { title: '', body: 'Newest' }),
  ]);
  expect((await notes.list()).map((n) => n.body)).toEqual(['Newest']);
});


test('upgrading preserves documents without resurrecting their historical notes', async () => {
  const { db, aead, store, notes } = await makeStore();
  const card = await store.create(fields({ name: 'Existing' }), images('existing'));
  const row = await db.getFirstAsync<{ payload: Uint8Array }>('SELECT payload FROM cards WHERE id = ?', [card.id]);
  const old = JSON.parse(utf8.decode(aead.open(row!.payload)));
  old.notes = 'Former document note';
  await db.runAsync('UPDATE cards SET payload = ? WHERE id = ?', [aead.seal(utf8.encode(JSON.stringify(old))), card.id]);
  await db.execAsync('DROP TABLE notes; DROP TABLE people; ALTER TABLE cards DROP COLUMN person_id; ALTER TABLE cards DROP COLUMN deleted_at; PRAGMA user_version = 4;');
  await migrate(db);
  expect(await notes.list()).toEqual([]);
  expect(await store.get(card.id)).toEqual(card);
});

test('notes edited at the same moment keep a stable order by id, and pins survive reopening', async () => {
  const { db, aead } = await makeStore();
  const notes = createNoteStore({ db, aead, now: () => 5_000 });
  await notes.save('c', { title: 'C', body: '' });
  await notes.save('a', { title: 'A', body: '' });
  await notes.save('b', { title: 'B', body: '' });
  expect((await notes.list()).map((n) => n.id)).toEqual(['a', 'b', 'c']);
  await notes.setPinned('c', true);
  const reopened = createNoteStore({ db, aead });
  expect((await reopened.list()).map((n) => [n.id, n.pinned])).toEqual([
    ['c', true],
    ['a', false],
    ['b', false],
  ]);
});

test('deleting a note is permanent across reopening and leaves documents and images alone', async () => {
  const { db, aead, notes, store, blobs } = await makeStore();
  await store.create(fields(), images('doc'));
  await notes.save('a', { title: 'Keep out', body: 'Private' });
  const before = blobs.raw.size;
  await notes.remove('a');
  const reopened = createNoteStore({ db, aead });
  expect(await reopened.get('a')).toBeNull();
  expect(await reopened.list()).toEqual([]);
  expect(await store.count()).toBe(1);
  expect(blobs.raw.size).toBe(before);
});

test('a reminder survives edits and reopening, stays encrypted, and can be cleared', async () => {
  const { notes, db, aead } = await makeStore();
  const original = await notes.save('a', { title: 'Private', body: 'Secret' });
  const reminderAt = 1900000123456;
  await notes.setReminder('a', reminderAt);
  expect(await notes.get('a')).toMatchObject({ reminderAt, updatedAt: original.updatedAt });
  await notes.save('a', { title: 'Changed', body: 'Secret' });
  const reopened = createNoteStore({ db, aead });
  expect(await reopened.get('a')).toMatchObject({ reminderAt, title: 'Changed' });
  const raw = await db.getFirstAsync<{ payload: Uint8Array }>('SELECT payload FROM notes', []);
  expect(Buffer.from(raw!.payload).toString()).not.toContain(String(reminderAt));
  await reopened.setReminder('a', null);
  expect((await reopened.get('a'))!.reminderAt).toBeUndefined();
});

test('note tags share document names, filter the list, survive edits, and stay sealed', async () => {
  const { notes, db } = await makeStore();
  await notes.save('a', { title: 'Visa steps', body: 'Embassy call' });
  await notes.save('b', { title: 'Shopping', body: 'Milk' });
  await notes.setTags('a', [' Travel ', 'travel', 'ID']);
  await notes.save('a', { title: 'Updated visa steps', body: 'Embassy call' });
  const all = await notes.list();
  expect(all.find((note) => note.id === 'a')?.tags).toEqual(['Travel', 'ID']);
  expect(findNotes(all, '', 'travel').map((note) => note.id)).toEqual(['a']);
  const raw = await db.getFirstAsync<{ payload: Uint8Array }>('SELECT payload FROM notes WHERE id = ?', ['a']);
  expect(Buffer.from(raw!.payload).toString()).not.toContain('Travel');
});

test('a note links to one current document and stays after that document is deleted', async () => {
  const { store, notes } = await makeStore();
  const card = await store.create(fields(), images('doc'));
  await notes.save('a', { title: 'Embassy', body: 'Call before travel' });
  await notes.setDocument('a', card.id);
  expect((await notes.get('a'))?.documentId).toBe(card.id);
  await store.moveToRecentlyDeleted(card.id);
  expect(await notes.get('a')).toMatchObject({ title: 'Embassy', documentId: null });
  await expect(notes.setDocument('a', card.id)).rejects.toThrow('Document not found');
});

test('deletion waits for an in-flight note save before clearing its document link', async () => {
  const { store, notes, db } = await makeStore();
  const card = await store.create(fields(), images('doc'));
  await notes.save('a', { title: 'Original', body: 'Text' });
  await notes.setDocument('a', card.id);
  let entered!: () => void;
  let release!: () => void;
  const atWrite = new Promise<void>((resolve) => { entered = resolve; });
  const held = new Promise<void>((resolve) => { release = resolve; });
  const originalRun = db.runAsync.bind(db);
  db.runAsync = async (sql, params) => {
    if (sql.startsWith('UPDATE notes SET payload = ?, updated_at = ?')) { entered(); await held; }
    return originalRun(sql, params);
  };
  const saving = notes.save('a', { title: 'Updated', body: 'Text' });
  await atWrite;
  const deleting = store.moveToRecentlyDeleted(card.id);
  release();
  await Promise.all([saving, deleting]);
  expect(await notes.get('a')).toMatchObject({ title: 'Updated', documentId: null });
});

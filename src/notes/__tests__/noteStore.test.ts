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
  await db.execAsync('DROP TABLE notes; ALTER TABLE cards DROP COLUMN deleted_at; PRAGMA user_version = 4;');
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

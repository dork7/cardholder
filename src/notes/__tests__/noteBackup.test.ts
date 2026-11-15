import { backupSnapshot, fields, images, makeStore } from '../../../test/fixtures';
import { createCardStore } from '../../cards/cardStore';
import { SqlDb } from '../../storage/sqlDb';
import { decodeBackup, encodeBackup, parseSnapshot } from '../../backup/backupFile';
import { applySnapshot, buildSnapshot } from '../../backup/backupService';

const secret = 'private backup passphrase';

test.each([false, true])('encrypted notes backup round trip, with documents: %s', async (withDocument) => {
  const a = await makeStore();
  if (withDocument) await a.store.create(fields(), images('doc'));
  await a.notes.save('a', { title: '', body: '  multiline\nnote  ' });
  await a.notes.save('b', { title: 'Title only', body: '' });
  await a.notes.setPinned('a', true);
  const snapshot = await buildSnapshot(a.store, 42, a.notes);
  const encrypted = await encodeBackup(snapshot, secret, { iterations: 1_000 });
  expect(Buffer.from(encrypted).toString()).not.toContain('multiline');
  const decoded = await decodeBackup(encrypted, secret);
  const b = await makeStore();
  expect(await applySnapshot(b.store, decoded, 'replace', b.notes)).toMatchObject({ notesAdded: 2, notesSkipped: 0 });
  expect(await b.notes.list()).toEqual(await a.notes.list());
  expect(await b.store.list()).toEqual(await a.store.list());
});

test('merge keeps notes with matching IDs and adds missing notes', async () => {
  const a = await makeStore();
  await a.notes.save('same', { title: '', body: 'From backup' });
  await a.notes.save('fresh', { title: '', body: 'New note' });
  const snapshot = await buildSnapshot(a.store, 42, a.notes);
  const b = await makeStore();
  await b.notes.save('same', { title: '', body: 'Keep mine' });
  expect(await applySnapshot(b.store, snapshot, 'merge', b.notes)).toMatchObject({ notesAdded: 1, notesSkipped: 1 });
  expect((await b.notes.get('same'))!.body).toBe('Keep mine');
  expect((await b.notes.get('fresh'))!.body).toBe('New note');
});

test('older backups have no incoming notes: merge preserves, replace clears', async () => {
  const raw = { ...backupSnapshot() };
  delete raw.notes;
  const snapshot = parseSnapshot(raw);
  expect(snapshot.notes).toEqual([]);
  const phone = await makeStore();
  await phone.notes.save('mine', { title: '', body: 'Keep on merge' });
  await applySnapshot(phone.store, snapshot, 'merge', phone.notes);
  expect(await phone.notes.list()).toHaveLength(1);
  await applySnapshot(phone.store, snapshot, 'replace', phone.notes);
  expect(await phone.notes.list()).toEqual([]);
});

test.each([
  { id: '../path', title: '', body: 'A', pinned: false, createdAt: 1, updatedAt: 1 },
  { id: 'a', title: 42, body: 'A', pinned: false, createdAt: 1, updatedAt: 1 },
  { id: 'a', title: '', body: '\n', pinned: false, createdAt: 1, updatedAt: 1 },
  { id: 'a', title: '', body: 'A', pinned: 'yes', createdAt: 1, updatedAt: 1 },
  { id: 'a', title: '', body: 'A', pinned: false, createdAt: null, updatedAt: 1 },
])('malformed note is rejected before restore: %j', (note) => {
  expect(() => parseSnapshot({ ...backupSnapshot(), notes: [note] })).toThrow('invalid-contents');
});

test('duplicate IDs and malformed notes collections are rejected', () => {
  const note = { id: 'a', title: '', body: 'A', pinned: false, createdAt: 1, updatedAt: 1 };
  expect(() => parseSnapshot({ ...backupSnapshot(), notes: [note, { ...note, id: 'A' }] })).toThrow('invalid-contents');
  expect(() => parseSnapshot({ ...backupSnapshot(), notes: {} })).toThrow('invalid-contents');
});

test('failed restore rolls back notes and document rows together', async () => {
  const phone = await makeStore();
  const mine = await phone.store.create(fields({ name: 'Keep document' }), images('mine'));
  const note = await phone.notes.save('keep', { title: '', body: 'Keep note' });
  const flaky: SqlDb = { ...phone.db, async runAsync(sql, params) {
    if (sql.startsWith('INSERT INTO cards')) throw new Error('Disk full');
    return phone.db.runAsync(sql, params);
  } };
  const store = createCardStore({ db: flaky, aead: phone.aead, blobs: phone.blobs });
  const snapshot = { ...backupSnapshot(), notes: [{ ...note, id: 'incoming', body: 'Incoming' }] };
  await expect(applySnapshot(store, snapshot, 'replace', phone.notes)).rejects.toThrow('Disk full');
  expect(await phone.notes.list()).toEqual([note]);
  expect((await phone.store.get(mine.id))!.name).toBe('Keep document');
});

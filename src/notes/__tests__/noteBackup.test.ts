import { backupSnapshot, fields, images, makeStore } from '../../../test/fixtures';
import { createCardStore } from '../../cards/cardStore';
import { SqlDb } from '../../storage/sqlDb';
import { BackupSnapshot, decodeBackup, encodeBackup, parseSnapshot } from '../../backup/backupFile';
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

const roundTrip = async (snapshot: BackupSnapshot) =>
  decodeBackup(await encodeBackup(snapshot, secret, { iterations: 1_000 }), secret);

test('replace swaps current notes for the backup notes, keeping pins, timestamps and order', async () => {
  const a = await makeStore();
  await a.notes.save('older', { title: 'Older', body: '' });
  await a.notes.save('newer', { title: 'Newer', body: '' });
  await a.notes.save('latest', { title: 'Latest', body: '' });
  await a.notes.setPinned('older', true);
  const snapshot = await roundTrip(await buildSnapshot(a.store, 42, a.notes));
  const b = await makeStore();
  await b.notes.save('mine', { title: 'Only on this phone', body: '' });
  await applySnapshot(b.store, snapshot, 'replace', b.notes);
  const restored = await b.notes.list();
  expect(restored.map((note) => note.id)).toEqual(['older', 'latest', 'newer']);
  expect(restored).toEqual(await a.notes.list());
});

test('a backup with an empty notes collection round trips; merge keeps current notes, replace clears them', async () => {
  const a = await makeStore();
  await a.store.create(fields(), images('doc'));
  const snapshot = await roundTrip(await buildSnapshot(a.store, 42, a.notes));
  expect(snapshot.notes).toEqual([]);
  const b = await makeStore();
  await b.notes.save('mine', { title: '', body: 'Mine' });
  expect(await applySnapshot(b.store, snapshot, 'merge', b.notes)).toMatchObject({ added: 1, notesAdded: 0, notesSkipped: 0 });
  expect(await b.notes.list()).toHaveLength(1);
  expect(await applySnapshot(b.store, snapshot, 'replace', b.notes)).toMatchObject({ added: 1, notesAdded: 0 });
  expect(await b.notes.list()).toEqual([]);
});

test('a notes backup opened with the wrong passphrase, or damaged, is refused', async () => {
  const a = await makeStore();
  await a.notes.save('a', { title: '', body: 'Secret' });
  const encrypted = await encodeBackup(await buildSnapshot(a.store, 42, a.notes), secret, { iterations: 1_000 });
  await expect(decodeBackup(encrypted, 'not the passphrase')).rejects.toThrow('wrong-passphrase-or-damaged');
  const damaged = encrypted.slice();
  damaged[damaged.length - 1] ^= 1;
  await expect(decodeBackup(damaged, secret)).rejects.toThrow('wrong-passphrase-or-damaged');
});

test('a failed merge adds none of the incoming notes', async () => {
  const phone = await makeStore();
  const note = await phone.notes.save('keep', { title: '', body: 'Keep note' });
  const flaky: SqlDb = { ...phone.db, async runAsync(sql, params) {
    if (sql.startsWith('INSERT INTO cards')) throw new Error('Disk full');
    return phone.db.runAsync(sql, params);
  } };
  const store = createCardStore({ db: flaky, aead: phone.aead, blobs: phone.blobs });
  const snapshot = { ...backupSnapshot(), notes: [{ ...note, id: 'incoming', body: 'Incoming' }] };
  await expect(applySnapshot(store, snapshot, 'merge', phone.notes)).rejects.toThrow('Disk full');
  expect(await phone.notes.list()).toEqual([note]);
});

test('right after a restore, the restored notes are not reported as changed since that backup', async () => {
  const a = await makeStore();
  await a.notes.save('a', { title: '', body: 'Backed up' });
  const snapshot = await buildSnapshot(a.store, 42, a.notes);
  for (const mode of ['replace', 'merge'] as const) {
    const b = await makeStore();
    await applySnapshot(b.store, snapshot, mode, b.notes);
    expect(await b.notes.lastChangeAt()).toBeLessThanOrEqual(snapshot.exportedAt);
  }
});

test('merging backup notes into a phone with notes of its own counts as a change', async () => {
  const a = await makeStore();
  await a.notes.save('a', { title: '', body: 'Backed up' });
  const snapshot = await buildSnapshot(a.store, 42, a.notes);
  const b = await makeStore();
  await b.notes.save('mine', { title: '', body: 'Not in that backup' });
  await applySnapshot(b.store, snapshot, 'merge', b.notes);
  expect(await b.notes.lastChangeAt()).toBeGreaterThan(snapshot.exportedAt);
});

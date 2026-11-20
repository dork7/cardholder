import { fields, images, importEntry, makeStore } from '../../../test/fixtures';
import { decodeBackup, encodeBackup } from '../../backup/backupFile';
import { applySnapshot, buildSnapshot } from '../../backup/backupService';
import { createCardStore } from '../../cards/cardStore';
import { utf8 } from '../../crypto/bytes';
import { createNoteStore } from '../../notes/noteStore';
import { spaceFor } from '../../spaces/spaces';
import { migrate } from '../../storage/sqlDb';
import { listDocumentVisits, recordDocumentVisit } from '../documentVisits';

test('reopening moves a document to the top, pinning leaves visits alone, and deleted documents are excluded', async () => {
  const { db, store } = await makeStore();
  const first = await store.create(fields(), images('first'));
  const second = await store.create(fields(), images('second'));
  await recordDocumentVisit(db, first.id, 10);
  await recordDocumentVisit(db, second.id, 20);
  await recordDocumentVisit(db, first.id, 30);
  await recordDocumentVisit(db, 'missing', 40);
  await store.setPinned(second.id, true);
  expect(await listDocumentVisits(db)).toEqual([{ id: first.id, visitedAt: 30 }, { id: second.id, visitedAt: 20 }]);
  await store.moveToRecentlyDeleted(first.id);
  expect(await listDocumentVisits(db)).toEqual([{ id: second.id, visitedAt: 20 }]);
});

test('upgrading existing records uses Personal for absent or unknown assignments', async () => {
  const { db, store, notes, aead, blobs } = await makeStore();
  const card = await store.create(fields({ tags: ['Insurance'] }), images('old'));
  await notes.save('note', { title: 'Old note', body: 'Call' });
  await notes.setDocument('note', card.id);
  await db.execAsync('DROP TABLE document_visits; PRAGMA user_version = 7');
  await migrate(db);

  const upgradedCards = createCardStore({ db, aead, blobs });
  const upgradedNotes = createNoteStore({ db, aead });
  expect(spaceFor((await upgradedCards.get(card.id))?.spaceId).id).toBe('personal');
  expect(spaceFor((await upgradedNotes.get('note'))?.spaceId).id).toBe('personal');
  expect(await listDocumentVisits(db)).toEqual([]);

  // Simulate a saved payload from a version that used a space ID this version does not recognize.
  for (const [table, id] of [['cards', card.id], ['notes', 'note']]) {
    const row = await db.getFirstAsync<{ payload: Uint8Array }>(`SELECT payload FROM ${table} WHERE id = ?`, [id]);
    const payload = JSON.parse(utf8.decode(aead.open(row!.payload)));
    const sealed = aead.seal(utf8.encode(JSON.stringify({ ...payload, spaceId: 'archived-space' })));
    await db.runAsync(`UPDATE ${table} SET payload = ? WHERE id = ?`, [sealed, id]);
  }
  expect(await upgradedCards.get(card.id)).toMatchObject({ spaceId: 'personal', tags: ['Insurance'] });
  expect(await upgradedNotes.get('note')).toMatchObject({ spaceId: 'personal', documentId: card.id });
});

test.each(['merge', 'replace'] as const)('encrypted backup %s preserves assignments, tags, people and links', async (mode) => {
  const { db, store, notes, aead, blobs } = await makeStore();
  const person = await store.createPerson('Alex');
  const cardFields = fields({ name: 'Pass', tags: ['Travel'], personId: person.id });
  const card = await store.create(cardFields, images('pass'));
  const olderCard = await store.create(fields({ name: 'Older document' }), images('old'));
  await notes.save('note', { title: 'Insurance', body: 'Call' });
  await notes.save('older-note', { title: 'Older note', body: 'Reminder' });
  await notes.setTags('note', ['Policy']);
  await notes.setDocument('note', card.id);
  await Promise.all([
    store.update(card.id, { ...cardFields, spaceId: 'travel' }),
    store.update(card.id, { ...cardFields, name: 'Passport' }),
    notes.save('note', { title: 'Insurance', body: 'Call', spaceId: 'family' }),
    notes.save('note', { title: 'Insurance', body: 'Call tomorrow' }),
  ]);
  await recordDocumentVisit(db, card.id, 100);

  const reopenedCards = createCardStore({ db, aead, blobs });
  const reopenedNotes = createNoteStore({ db, aead });
  const snapshot = await buildSnapshot(reopenedCards, 100, reopenedNotes);
  expect(Object.keys(snapshot).sort()).toEqual(['cards', 'exportedAt', 'folders', 'formatVersion', 'notes', 'people']);
  const decoded = await decodeBackup(await encodeBackup(snapshot, 'passphrase', { iterations: 1_000 }), 'passphrase');

  const destination = await makeStore();
  if (mode === 'merge') {
    await destination.store.insertMany([importEntry('local')], { replace: false });
    await recordDocumentVisit(destination.db, 'local', 50);
  }
  const target = mode === 'merge' ? destination : { db, store, notes };
  await applySnapshot(target.store, decoded, mode, target.notes);

  expect(await listDocumentVisits(target.db)).toEqual(mode === 'merge' ? [{ id: 'local', visitedAt: 50 }] : []);
  expect(await target.store.get(card.id)).toMatchObject({ name: 'Passport', spaceId: 'travel', tags: ['Travel'], personId: person.id });
  expect(await target.store.listPeople()).toContainEqual(person);
  expect(await target.notes.get('note')).toMatchObject({ body: 'Call tomorrow', spaceId: 'family', tags: ['Policy'], documentId: card.id });
  expect(spaceFor((await target.store.get(olderCard.id))?.spaceId).id).toBe('personal');
  expect(spaceFor((await target.notes.get('older-note'))?.spaceId).id).toBe('personal');
});

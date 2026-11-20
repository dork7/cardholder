import { fields, images, makeStore } from '../../../test/fixtures';
import { decodeBackup, encodeBackup } from '../../backup/backupFile';
import { applySnapshot, buildSnapshot } from '../../backup/backupService';
import { spaceFor } from '../../spaces/spaces';
import { listDocumentVisits, recordDocumentVisit } from '../documentVisits';

test('reopening moves a document to the top and deleted documents are excluded', async () => {
  const { db, store } = await makeStore();
  const first = await store.create(fields(), images('first'));
  const second = await store.create(fields(), images('second'));
  await recordDocumentVisit(db, first.id, 10);
  await recordDocumentVisit(db, second.id, 20);
  await recordDocumentVisit(db, first.id, 30);
  await recordDocumentVisit(db, 'missing', 40);
  expect(await listDocumentVisits(db)).toEqual([{ id: first.id, visitedAt: 30 }, { id: second.id, visitedAt: 20 }]);
  await store.moveToRecentlyDeleted(first.id);
  expect(await listDocumentVisits(db)).toEqual([{ id: second.id, visitedAt: 20 }]);
});

test('encrypted backups preserve both space assignments and replacement clears visits', async () => {
  const { db, store, notes } = await makeStore();
  const card = await store.create(fields({ name: 'Pass', spaceId: 'travel' }), images('pass'));
  await store.create(fields({ name: 'An older document' }), images('old'));
  await notes.save('note', { title: 'Insurance', body: 'Call', spaceId: 'family' });
  await notes.save('note', { title: 'Insurance', body: 'Call tomorrow' });
  await recordDocumentVisit(db, card.id, 100);

  const snapshot = await buildSnapshot(store, 100, notes);
  const decoded = await decodeBackup(await encodeBackup(snapshot, 'passphrase', { iterations: 1_000 }), 'passphrase');
  await applySnapshot(store, decoded, 'replace', notes);

  expect(await listDocumentVisits(db)).toEqual([]);
  expect((await store.get(card.id))?.spaceId).toBe('travel');
  expect((await notes.get('note'))?.spaceId).toBe('family');
  expect(spaceFor((await store.get('card2'))?.spaceId).id).toBe('personal');
});

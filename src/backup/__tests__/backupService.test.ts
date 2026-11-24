import { backupSnapshot, fields, images, makeStore } from '../../../test/fixtures';
import { base64, utf8 } from '../../crypto/bytes';
import { blobName } from '../../cards/cardStore';
import { decodeBackup, encodeBackup, parseSnapshot } from '../backupFile';
import { applySnapshot, buildSnapshot, verifyBackup } from '../backupService';

const text = (b64: string | null) => (b64 === null ? null : utf8.decode(base64.decode(b64)));

test('export from one phone, replace-import on another', async () => {
  const phoneA = await makeStore();
  await phoneA.store.create(fields({ name: 'Emirates ID', tags: ['ID'], expiresOn: '2027-03-01' }), images('id', true));
  await phoneA.store.create(fields({ name: '' }), images('gym'));

  const bytes = await encodeBackup(await buildSnapshot(phoneA.store, 42), 'travel pass', { iterations: 1_000 });
  const snapshot = await decodeBackup(bytes, 'travel pass');
  expect(snapshot.exportedAt).toBe(42);

  const phoneB = await makeStore();
  expect(await applySnapshot(phoneB.store, snapshot, 'replace')).toEqual({ added: 2, skipped: 0, notesAdded: 0, notesSkipped: 0 });
  expect(await phoneB.store.list()).toEqual(await phoneA.store.list());
  expect(text(await phoneB.store.loadImage('card1', 'back'))).toBe('JPEG:id-back');
  expect(text(await phoneB.store.loadImage('card2', 'thumb'))).toBe('THUMB:gym');
});

test('verifying an encrypted backup reports its contents without changing the phone', async () => {
  const phone = await makeStore();
  await phone.store.create(fields({ name: 'Current' }), images('current'));
  const backup = backupSnapshot();
  const bytes = await encodeBackup(backup, 'travel pass', { iterations: 1_000 });
  expect(await verifyBackup(bytes, 'travel pass')).toEqual({
    exportedAt: backup.exportedAt, documents: backup.cards.length, notes: 0,
  });
  expect((await phone.store.list()).map((card) => card.name)).toEqual(['Current']);
});

test('merge keeps cards already on the phone and adds the rest', async () => {
  const { store } = await makeStore();
  await store.create(fields({ name: 'Mine' }), images('mine')); // id card1, same as the backup's first card
  const result = await applySnapshot(store, backupSnapshot(), 'merge');
  expect(result).toEqual({ added: 1, skipped: 1, notesAdded: 0, notesSkipped: 0 });
  expect((await store.get('card1'))!.name).toBe('Mine');
  expect((await store.get('card2'))!.name).toBe('Gym');
});

test('merge of a backup with nothing new is a no-op', async () => {
  const { store } = await makeStore();
  await applySnapshot(store, backupSnapshot(), 'merge');
  expect(await applySnapshot(store, backupSnapshot(), 'merge')).toEqual({ added: 0, skipped: 2, notesAdded: 0, notesSkipped: 0 });
  expect(await store.count()).toBe(2);
});

test('replace drops cards that are not in the backup', async () => {
  const { store } = await makeStore();
  await store.create(fields({ name: 'A' }), images('a'));
  await store.create(fields({ name: 'B' }), images('b'));
  await store.create(fields({ name: 'C' }), images('c'));
  expect(await applySnapshot(store, backupSnapshot(), 'replace')).toEqual({ added: 2, skipped: 0, notesAdded: 0, notesSkipped: 0 });
  expect((await store.list()).map((c) => c.name)).toEqual(['Emirates ID', 'Gym']);
});

test('a card whose back image is missing exports as front-only and still imports', async () => {
  const { store, blobs } = await makeStore();
  const card = await store.create(fields(), images('x', true));
  blobs.raw.delete(blobName(card.id, 'back'));
  const snapshot = await buildSnapshot(store, 1);
  expect(snapshot.cards[0].card).toMatchObject({ hasBack: false, backAspect: null });
  expect(snapshot.cards[0].images.back).toBeNull();
  expect(() => parseSnapshot(JSON.parse(JSON.stringify(snapshot)))).not.toThrow();
});

test('a missing thumbnail falls back to the front image', async () => {
  const { store, blobs } = await makeStore();
  const card = await store.create(fields(), images('x'));
  blobs.raw.delete(blobName(card.id, 'thumb'));
  const snapshot = await buildSnapshot(store, 1);
  expect(text(snapshot.cards[0].images.front.thumbJpegBase64)).toBe('JPEG:x');
});

test('new backups convert folder assignments to tags without carrying folders', async () => {
  const phoneA = await makeStore();
  const health = await phoneA.store.createFolder('Health');
  await phoneA.store.create(fields({ name: 'Daman', folderId: health.id }), images('daman'));

  const snapshot = await decodeBackup(
    await encodeBackup(await buildSnapshot(phoneA.store, 42), 'travel pass', { iterations: 1_000 }),
    'travel pass',
  );
  expect(snapshot.folders).toEqual([]);
  expect(snapshot.cards[0].card).toMatchObject({ folderId: null, tags: ['Health'] });

  const phoneB = await makeStore();
  await applySnapshot(phoneB.store, snapshot, 'replace');
  expect(await phoneB.store.listFolders()).toEqual([]);
  expect((await phoneB.store.list())[0]).toMatchObject({ folderId: null, tags: ['Health'] });
});

test('merge of an old backup with no new cards does not recreate folders', async () => {
  const { store } = await makeStore();
  await applySnapshot(store, backupSnapshot(), 'merge');
  const snapshot = { ...backupSnapshot(), folders: [{ id: 'f1', name: 'Family', createdAt: 1 }] };
  expect(await applySnapshot(store, snapshot, 'merge')).toEqual({ added: 0, skipped: 2, notesAdded: 0, notesSkipped: 0 });
  expect(await store.listFolders()).toEqual([]);
});

test('old backups map a folder to a tag on import', async () => {
  const { store } = await makeStore();
  const snapshot = backupSnapshot();
  snapshot.folders = [{ id: 'f1', name: 'Family', createdAt: 1 }];
  snapshot.cards[0].card.folderId = 'f1';
  await applySnapshot(store, snapshot, 'replace');
  expect((await store.get(snapshot.cards[0].card.id))?.tags).toContain('Family');
  expect(await store.listFolders()).toEqual([]);
});

test('a PDF card travels with its whole PDF and cover page', async () => {
  const phoneA = await makeStore();
  const pdfBase64 = base64.encode(utf8.encode('%PDF-1.7 policy'));
  const pages = ['Introduction', 'Terms', 'Renewal code Z8Q4', 'Signature'];
  await phoneA.store.create(fields({ name: 'Policy', readText: { front: pages[2], back: pages[1], pages } }),
    { ...images('cover'), pdf: { pdfBase64, pageCount: 4, coverPage: 2 } });

  const snapshot = await decodeBackup(await encodeBackup(await buildSnapshot(phoneA.store, 1), 'travel pass', { iterations: 1_000 }), 'travel pass');
  const phoneB = await makeStore();
  await applySnapshot(phoneB.store, snapshot, 'replace');
  expect((await phoneB.store.get('card1'))?.pdf).toEqual({ pageCount: 4, coverPage: 2 });
  expect((await phoneB.store.get('card1'))?.readText?.pages).toEqual(pages);
  expect(text(await phoneB.store.loadPdf('card1'))).toBe('%PDF-1.7 policy');
});

test('a PDF card whose PDF is missing exports as a photo card of its cover', async () => {
  const phoneA = await makeStore();
  const pdfBase64 = base64.encode(utf8.encode('%PDF-1.7 policy'));
  await phoneA.store.create(fields(), { ...images('cover'), pdf: { pdfBase64, pageCount: 4, coverPage: 2 } });
  await phoneA.blobs.remove(blobName('card1', 'pdf'));
  const snapshot = await buildSnapshot(phoneA.store, 1);
  expect(snapshot.cards[0].card.pdf).toBeNull();
  expect(snapshot.cards[0].images.pdf).toBeNull();
});

test('a backup PDF that is not a PDF, or whose cover page is out of range, is invalid', () => {
  const entry = (pdf: unknown) => {
    const snap = JSON.parse(JSON.stringify(backupSnapshot()));
    snap.cards[0].images.pdf = pdf;
    return () => parseSnapshot(snap);
  };
  const real = base64.encode(utf8.encode('%PDF-1.7 x'));
  expect(entry({ pdfBase64: real, pageCount: 2, coverPage: 1 })).not.toThrow();
  expect(entry({ pdfBase64: base64.encode(utf8.encode('JPEG:x')), pageCount: 2, coverPage: 1 })).toThrow('invalid-contents');
  expect(entry({ pdfBase64: real, pageCount: 2, coverPage: 2 })).toThrow('invalid-contents');
  expect(entry({ pdfBase64: real, pageCount: 0, coverPage: 0 })).toThrow('invalid-contents');
});

describe('Recently deleted', () => {
  test('a backup holds only current documents', async () => {
    const { store } = await makeStore();
    await store.create(fields({ name: 'Kept' }), images('kept'));
    const gone = await store.create(fields({ name: 'Gone' }), images('gone'));
    await store.moveToRecentlyDeleted(gone.id);
    expect((await buildSnapshot(store, 1)).cards.map((entry) => entry.card.name)).toEqual(['Kept']);
  });

  test('a replace restore empties Recently deleted, photos included', async () => {
    const { store, blobs } = await makeStore();
    await store.create(fields({ name: 'A' }), images('a')); // card1
    await store.create(fields({ name: 'B' }), images('b')); // card2
    const gone = await store.create(fields({ name: 'Gone' }), images('gone')); // card3, not in the backup
    await store.moveToRecentlyDeleted(gone.id);
    await applySnapshot(store, backupSnapshot(), 'replace');
    expect(await store.listRecentlyDeleted()).toEqual([]);
    expect((await blobs.list()).filter((name) => name.startsWith('card3.'))).toEqual([]);
  });

  test('a merge restore leaves Recently deleted as it was', async () => {
    const { store } = await makeStore();
    await store.create(fields({ name: 'Other' }), images('other')); // card1
    const gone = await store.create(fields({ name: 'Gone' }), images('gone')); // card2, also in the backup
    await store.moveToRecentlyDeleted(gone.id);
    expect(await applySnapshot(store, backupSnapshot(), 'merge')).toMatchObject({ added: 0, skipped: 2 });
    expect((await store.listRecentlyDeleted()).map((c) => c.name)).toEqual(['Gone']);
  });
});

test('profile details and card picture survive encrypted replace restore', async () => {
  const source = await makeStore();
  const person = await source.store.createPerson('Sara');
  const profile = { template: 'medical' as const, dateOfBirth: '1990-05-12', bloodGroup: 'A+' as const };
  const saved = await source.store.create(fields({ name: 'Sara', personId: person.id, profile }), images('profile'));
  const bytes = await encodeBackup(await buildSnapshot(source.store, 42), 'passphrase', { iterations: 1_000 });
  const target = await makeStore();
  await applySnapshot(target.store, await decodeBackup(bytes, 'passphrase'), 'replace');
  expect((await target.store.list())[0].profile).toEqual(profile);
  expect(text(await target.store.loadImage(saved.id, 'front'))).toBe('JPEG:profile');
});

test('merge skips another profile for a Person already profiled on the phone', async () => {
  const source = await makeStore();
  const person = await source.store.createPerson('Sara');
  await source.store.create(fields({ name: 'Sara', personId: person.id, profile: { template: 'medical', dateOfBirth: null, bloodGroup: 'A+' } }), images('incoming'));
  const snapshot = await decodeBackup(await encodeBackup(await buildSnapshot(source.store, 42), 'passphrase', { iterations: 1_000 }), 'passphrase');
  snapshot.cards[0].card.id = 'incoming';
  const target = await makeStore();
  await target.store.createPerson('Sara');
  await target.store.create(fields({ name: 'Sara', personId: person.id, profile: { template: 'medical', dateOfBirth: null, bloodGroup: 'O+' } }), images('existing'));
  expect(await applySnapshot(target.store, snapshot, 'merge')).toMatchObject({ added: 0, skipped: 1 });
  expect((await target.store.list()).filter((card) => card.profile)).toHaveLength(1);
});

test('malformed profile details are dropped while the document restores', () => {
  const snapshot = JSON.parse(JSON.stringify(backupSnapshot()));
  snapshot.cards[0].card.profile = { template: 'unknown', dateOfBirth: 'bad', bloodGroup: 'X' };
  expect(parseSnapshot(snapshot).cards[0].card.profile).toBeUndefined();
});

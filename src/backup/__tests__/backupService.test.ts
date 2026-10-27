import { backupSnapshot, fields, images, makeStore } from '../../../test/fixtures';
import { base64, utf8 } from '../../crypto/bytes';
import { blobName } from '../../cards/cardStore';
import { decodeBackup, encodeBackup, parseSnapshot } from '../backupFile';
import { applySnapshot, buildSnapshot } from '../backupService';

const text = (b64: string | null) => (b64 === null ? null : utf8.decode(base64.decode(b64)));

test('export from one phone, replace-import on another', async () => {
  const phoneA = await makeStore();
  await phoneA.store.create(fields({ name: 'Emirates ID', category: 'id', expiresOn: '2027-03-01' }), images('id', true));
  await phoneA.store.create(fields({ name: '' }), images('gym'));

  const bytes = await encodeBackup(await buildSnapshot(phoneA.store, 42), 'travel pass', { iterations: 1_000 });
  const snapshot = await decodeBackup(bytes, 'travel pass');
  expect(snapshot.exportedAt).toBe(42);

  const phoneB = await makeStore();
  expect(await applySnapshot(phoneB.store, snapshot, 'replace')).toEqual({ added: 2, skipped: 0 });
  expect(await phoneB.store.list()).toEqual(await phoneA.store.list());
  expect(text(await phoneB.store.loadImage('card1', 'back'))).toBe('JPEG:id-back');
  expect(text(await phoneB.store.loadImage('card2', 'thumb'))).toBe('THUMB:gym');
});

test('merge keeps cards already on the phone and adds the rest', async () => {
  const { store } = await makeStore();
  await store.create(fields({ name: 'Mine' }), images('mine')); // id card1, same as the backup's first card
  const result = await applySnapshot(store, backupSnapshot(), 'merge');
  expect(result).toEqual({ added: 1, skipped: 1 });
  expect((await store.get('card1'))!.name).toBe('Mine');
  expect((await store.get('card2'))!.name).toBe('Gym');
});

test('merge of a backup with nothing new is a no-op', async () => {
  const { store } = await makeStore();
  await applySnapshot(store, backupSnapshot(), 'merge');
  expect(await applySnapshot(store, backupSnapshot(), 'merge')).toEqual({ added: 0, skipped: 2 });
  expect(await store.count()).toBe(2);
});

test('replace drops cards that are not in the backup', async () => {
  const { store } = await makeStore();
  await store.create(fields({ name: 'A' }), images('a'));
  await store.create(fields({ name: 'B' }), images('b'));
  await store.create(fields({ name: 'C' }), images('c'));
  expect(await applySnapshot(store, backupSnapshot(), 'replace')).toEqual({ added: 2, skipped: 0 });
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

test('folders and the cards in them travel with the backup', async () => {
  const phoneA = await makeStore();
  const health = await phoneA.store.createFolder('Health');
  await phoneA.store.create(fields({ name: 'Daman', folderId: health.id }), images('daman'));

  const snapshot = await decodeBackup(
    await encodeBackup(await buildSnapshot(phoneA.store, 42), 'travel pass', { iterations: 1_000 }),
    'travel pass',
  );
  expect(snapshot.folders).toEqual([health]);

  const phoneB = await makeStore();
  await applySnapshot(phoneB.store, snapshot, 'replace');
  expect(await phoneB.store.listFolders()).toEqual([health]);
  expect((await phoneB.store.list())[0].folderId).toBe(health.id);
});

test('merge adds the backup\'s folders even when every card is already on the phone', async () => {
  const { store } = await makeStore();
  await applySnapshot(store, backupSnapshot(), 'merge');
  const snapshot = { ...backupSnapshot(), folders: [{ id: 'f1', name: 'Family', createdAt: 1 }] };
  expect(await applySnapshot(store, snapshot, 'merge')).toEqual({ added: 0, skipped: 2 });
  expect((await store.listFolders()).map((f) => f.name)).toEqual(['Family']);
});

test('a PDF card travels with its whole PDF and cover page', async () => {
  const phoneA = await makeStore();
  const pdfBase64 = base64.encode(utf8.encode('%PDF-1.7 policy'));
  await phoneA.store.create(fields({ name: 'Policy' }), { ...images('cover'), pdf: { pdfBase64, pageCount: 4, coverPage: 2 } });

  const snapshot = await decodeBackup(await encodeBackup(await buildSnapshot(phoneA.store, 1), 'travel pass', { iterations: 1_000 }), 'travel pass');
  const phoneB = await makeStore();
  await applySnapshot(phoneB.store, snapshot, 'replace');
  expect((await phoneB.store.get('card1'))?.pdf).toEqual({ pageCount: 4, coverPage: 2 });
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

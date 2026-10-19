import { backupSnapshot, fields, images, makeStore } from '../../../test/fixtures';
import { base64, utf8 } from '../../crypto/bytes';
import { blobName } from '../../cards/cardStore';
import { decodeBackup, encodeBackup, parseSnapshot } from '../backupFile';
import { applySnapshot, buildSnapshot } from '../backupService';

const text = (b64: string | null) => (b64 === null ? null : utf8.decode(base64.decode(b64)));

test('export from one phone, replace-import on another', async () => {
  const phoneA = await makeStore();
  await phoneA.store.create(fields({ name: 'Emirates ID', category: 'id', expiresOn: '2027-03-01' }), images('id', true));
  await phoneA.store.create(fields({ name: 'Gym', notes: 'Locker 12' }), images('gym'));

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

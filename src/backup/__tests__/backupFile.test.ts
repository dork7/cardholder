import { backupSnapshot } from '../../../test/fixtures';
import { utf8 } from '../../crypto/bytes';
import { BackupError, BackupErrorCode, decodeBackup, encodeBackup, parseSnapshot } from '../backupFile';

const FAST = { iterations: 1_000 };

async function codeOf(promise: Promise<unknown>): Promise<BackupErrorCode | 'resolved' | 'other'> {
  try {
    await promise;
    return 'resolved';
  } catch (e) {
    return e instanceof BackupError ? e.code : 'other';
  }
}

const parseCode = (value: unknown) => codeOf(Promise.resolve().then(() => parseSnapshot(value)));
const rawSnapshot = () => JSON.parse(JSON.stringify(backupSnapshot()));

test('round-trips a snapshot', async () => {
  const bytes = await encodeBackup(backupSnapshot(), 'correct horse', FAST);
  expect(await decodeBackup(bytes, 'correct horse')).toEqual(backupSnapshot());
});

test('uses 600,000 PBKDF2 iterations by default', async () => {
  const bytes = await encodeBackup(backupSnapshot(), 'correct horse');
  expect(new DataView(bytes.buffer, bytes.byteOffset).getUint32(5)).toBe(600_000);
  expect(await decodeBackup(bytes, 'correct horse')).toEqual(backupSnapshot());
}, 20_000);

test('salt is random: same input, different files', async () => {
  const a = await encodeBackup(backupSnapshot(), 'pass phrase', FAST);
  const b = await encodeBackup(backupSnapshot(), 'pass phrase', FAST);
  expect(Buffer.from(a).equals(Buffer.from(b))).toBe(false);
});

test('composed and decomposed passphrases are the same passphrase', async () => {
  const bytes = await encodeBackup(backupSnapshot(), 'caf\u00e9 latte', FAST);
  expect(await decodeBackup(bytes, 'cafe\u0301 latte')).toEqual(backupSnapshot());
});

test('wrong passphrase', async () => {
  const bytes = await encodeBackup(backupSnapshot(), 'right pass', FAST);
  expect(await codeOf(decodeBackup(bytes, 'wrong pass'))).toBe('wrong-passphrase-or-damaged');
});

test('a damaged file is reported like a wrong passphrase', async () => {
  const bytes = await encodeBackup(backupSnapshot(), 'right pass', FAST);
  bytes[bytes.length - 30] ^= 0xff;
  expect(await codeOf(decodeBackup(bytes, 'right pass'))).toBe('wrong-passphrase-or-damaged');
});

test('random files are not backups', async () => {
  expect(await codeOf(decodeBackup(utf8.encode('hello, this is a text file'), 'x'))).toBe('not-a-backup');
  expect(await codeOf(decodeBackup(new Uint8Array(3), 'x'))).toBe('not-a-backup');
});

test('newer format version', async () => {
  const bytes = await encodeBackup(backupSnapshot(), 'right pass', FAST);
  bytes[4] = 2;
  expect(await codeOf(decodeBackup(bytes, 'right pass'))).toBe('unsupported-version');
});

test('absurd iteration counts are rejected before deriving a key', async () => {
  const bytes = await encodeBackup(backupSnapshot(), 'right pass', FAST);
  new DataView(bytes.buffer, bytes.byteOffset).setUint32(5, 0xffffffff);
  expect(await codeOf(decodeBackup(bytes, 'right pass'))).toBe('not-a-backup');
});

test('valid encryption around invalid contents is rejected', async () => {
  const bad = { ...backupSnapshot(), formatVersion: 7 } as unknown as Parameters<typeof encodeBackup>[0];
  const bytes = await encodeBackup(bad, 'right pass', FAST);
  expect(await codeOf(decodeBackup(bytes, 'right pass'))).toBe('invalid-contents');
});

describe('parseSnapshot', () => {
  test('accepts a valid snapshot', async () => {
    expect(await parseCode(rawSnapshot())).toBe('resolved');
  });

  test('rejects ids that could escape the cards folder', async () => {
    for (const id of ['../escape', 'a/b', '', 'x'.repeat(65), 'card.front']) {
      const raw = rawSnapshot();
      raw.cards[0].card.id = id;
      expect(await parseCode(raw)).toBe('invalid-contents');
    }
  });

  test('rejects duplicate ids', async () => {
    const raw = rawSnapshot();
    raw.cards[1].card.id = raw.cards[0].card.id;
    expect(await parseCode(raw)).toBe('invalid-contents');
  });

  test('rejects ids that collide when case-folded', async () => {
    const raw = rawSnapshot();
    raw.cards[0].card.id = 'ABC';
    raw.cards[1].card.id = 'abc';
    expect(await parseCode(raw)).toBe('invalid-contents');
  });

  test('rejects hasBack that disagrees with the images', async () => {
    const raw = rawSnapshot();
    raw.cards[0].card.hasBack = true;
    expect(await parseCode(raw)).toBe('invalid-contents');
  });

  test('rejects a missing front image or thumbnail', async () => {
    const noFront = rawSnapshot();
    delete noFront.cards[0].images.front;
    expect(await parseCode(noFront)).toBe('invalid-contents');
    const noThumb = rawSnapshot();
    delete noThumb.cards[0].images.front.thumbJpegBase64;
    expect(await parseCode(noThumb)).toBe('invalid-contents');
  });

  test('rejects invalid card fields', async () => {
    const raw = rawSnapshot();
    raw.cards[0].card.category = 'x'.repeat(25); // a typed category, but longer than one can be
    expect(await parseCode(raw)).toBe('invalid-contents');
  });

  test('backups made before folders read as having none', () => {
    const raw = rawSnapshot();
    delete raw.folders;
    expect(parseSnapshot(raw).folders).toEqual([]);
  });

  test('a card in a folder the file does not hold is kept, outside any folder', () => {
    const raw = rawSnapshot();
    raw.folders = [{ id: 'f1', name: 'Family', createdAt: 1 }];
    raw.cards[0].card.folderId = 'f1';
    raw.cards[1].card.folderId = 'gone';
    const parsed = parseSnapshot(raw);
    expect(parsed.cards.map((c) => c.card.folderId)).toEqual(['f1', null]);
  });

  test('rejects bad folders', async () => {
    for (const folders of [
      'nope',
      [{ id: '../x', name: 'A', createdAt: 1 }],
      [{ id: 'f1', name: '  ', createdAt: 1 }],
      [{ id: 'f1', name: 'x'.repeat(31), createdAt: 1 }],
      [{ id: 'f1', name: 'A' }],
      [
        { id: 'f1', name: 'A', createdAt: 1 },
        { id: 'F1', name: 'B', createdAt: 1 },
      ],
    ]) {
      expect(await parseCode({ ...rawSnapshot(), folders })).toBe('invalid-contents');
    }
  });

  test('rejects non-objects', async () => {
    expect(await parseCode(null)).toBe('invalid-contents');
    expect(await parseCode([])).toBe('invalid-contents');
    expect(await parseCode({ formatVersion: 1, exportedAt: 1, cards: 'nope' })).toBe('invalid-contents');
  });
});

test('older backups with a card number, notes and Loyalty still import', () => {
  const raw = rawSnapshot();
  Object.assign(raw.cards[0].card, { number: '784', notes: 'Renew at ICP', category: 'loyalty' });
  const [card] = parseSnapshot(raw).cards.map((c) => c.card);
  expect(card.category).toBe('other');
  expect(card).not.toHaveProperty('number');
  expect(card).not.toHaveProperty('notes');
});

test('tags survive the round trip; a backup from before tags loads with none', async () => {
  const decoded = await decodeBackup(await encodeBackup(backupSnapshot(), 'correct horse', FAST), 'correct horse');
  expect(decoded.cards[0].card.tags).toEqual(['Government']);
  const old = rawSnapshot();
  delete old.cards[0].card.tags;
  expect(parseSnapshot(old).cards[0].card.tags).toEqual([]);
});

test('malformed tags make the backup invalid', async () => {
  const bad = rawSnapshot();
  bad.cards[0].card.tags = [42];
  expect(await parseCode(bad)).toBe('invalid-contents');
});

import { atomicReplace, ReplaceOps } from '../atomicReplace';

// A tiny in-memory "directory" that can be told to fail at a chosen step.
function fakeDir(initial: Record<string, string> = {}, fail: { write?: boolean; move?: boolean; remove?: boolean } = {}) {
  const files = new Map<string, string>(Object.entries(initial));
  const ops: ReplaceOps = {
    async write(name, bytes) {
      // A failed write may leave a partial file behind at the temp name, like a real disk.
      files.set(name, 'partial');
      if (fail.write) throw new Error('disk full');
      files.set(name, new TextDecoder().decode(bytes));
    },
    async moveOver(from, to) {
      if (fail.move) throw new Error('move failed');
      files.set(to, files.get(from)!);
      files.delete(from);
    },
    async remove(name) {
      if (fail.remove) throw new Error('remove failed');
      files.delete(name);
    },
  };
  return { files, ops };
}

const bytes = (s: string) => new TextEncoder().encode(s);

test('replaces the destination with the new bytes and leaves no temp file', async () => {
  const { files, ops } = fakeDir({ 'a.bin': 'old' });
  await atomicReplace(ops, 'a.bin', bytes('new'), 'a.bin.1.tmp');
  expect([...files.entries()]).toEqual([['a.bin', 'new']]);
});

test('creates the destination when none exists yet', async () => {
  const { files, ops } = fakeDir();
  await atomicReplace(ops, 'a.bin', bytes('first'), 'a.bin.1.tmp');
  expect([...files.entries()]).toEqual([['a.bin', 'first']]);
});

test('a failed write leaves the old destination intact and cleans up the temp file', async () => {
  const { files, ops } = fakeDir({ 'a.bin': 'old' }, { write: true });
  await expect(atomicReplace(ops, 'a.bin', bytes('new'), 'a.bin.1.tmp')).rejects.toThrow('disk full');
  expect([...files.entries()]).toEqual([['a.bin', 'old']]);
});

test('a failed move leaves the old destination intact and cleans up the temp file', async () => {
  const { files, ops } = fakeDir({ 'a.bin': 'old' }, { move: true });
  await expect(atomicReplace(ops, 'a.bin', bytes('new'), 'a.bin.1.tmp')).rejects.toThrow('move failed');
  expect([...files.entries()]).toEqual([['a.bin', 'old']]);
});

test('the original error surfaces even when temp cleanup also fails', async () => {
  const { files, ops } = fakeDir({ 'a.bin': 'old' }, { write: true, remove: true });
  await expect(atomicReplace(ops, 'a.bin', bytes('new'), 'a.bin.1.tmp')).rejects.toThrow('disk full');
  expect(files.get('a.bin')).toBe('old');
});

import { makeStore } from '../../../test/fixtures';
import { createNoteEditors } from '../noteEditors';
import { NoteStore } from '../noteStore';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('autosave creates one note and flushes the latest edit before finishing', async () => {
  const { notes } = await makeStore();
  const editors = createNoteEditors(notes);
  const editor = editors.open(null);
  editor.change({ title: '', body: 'First' });
  await jest.advanceTimersByTimeAsync(300);
  editor.change({ title: 'Title', body: 'Newest\ntext' });
  await editor.finish();
  expect(await notes.list()).toEqual([expect.objectContaining({ title: 'Title', body: 'Newest\ntext' })]);
  expect(editor.status()).toBe('saved');
});

test('an older slow save cannot overwrite newer text or create duplicates', async () => {
  const { notes } = await makeStore();
  let release!: () => void;
  const wait = new Promise<void>((resolve) => { release = resolve; });
  let first = true;
  const slow: NoteStore = { ...notes, async save(id, fields) {
    if (first) { first = false; await wait; }
    return notes.save(id, fields);
  } };
  const editor = createNoteEditors(slow).open(null);
  editor.change({ title: '', body: 'Old' });
  const flushing = editor.flush();
  editor.change({ title: '', body: 'Newest' });
  release();
  await flushing;
  await editor.finish();
  expect((await notes.list()).map((n) => n.body)).toEqual(['Newest']);
});

test('blank drafts disappear; clearing then rewriting keeps the existing identity', async () => {
  const { notes } = await makeStore();
  const editors = createNoteEditors(notes);
  await editors.open(null).finish();
  expect(await notes.list()).toEqual([]);
  const note = await notes.save('kept', { title: '', body: 'Before' });
  const editor = editors.open(note);
  editor.change({ title: '', body: '' });
  await editor.flush();
  expect(await notes.get('kept')).not.toBeNull();
  editor.change({ title: '', body: 'After' });
  await editor.finish();
  expect((await notes.get('kept'))!.body).toBe('After');
  const clearing = editors.open((await notes.get('kept'))!);
  clearing.change({ title: ' ', body: '\n' });
  await clearing.finish();
  expect(await notes.list()).toEqual([]);
});

test('save failure stays retryable and does not report saved or lose text', async () => {
  const { notes } = await makeStore();
  let fail = true;
  const editor = createNoteEditors({ ...notes, async save(id, fields) {
    if (fail) throw new Error('Disk full');
    return notes.save(id, fields);
  } }).open(null);
  editor.change({ title: '', body: 'Retain me' });
  await expect(editor.finish()).rejects.toThrow('Note save failed');
  expect(editor.status()).toBe('error');
  expect(await notes.list()).toEqual([]);
  fail = false;
  await editor.finish();
  expect((await notes.list())[0].body).toBe('Retain me');
});

test('backup flushing includes pending edits; deleting waits for a save and never resurrects a note', async () => {
  const { notes } = await makeStore();
  const editors = createNoteEditors(notes);
  const editor = editors.open(null);
  editor.change({ title: 'A', body: 'Pending' });
  await editors.flushAll();
  expect((await notes.list())[0].body).toBe('Pending');
  editor.change({ title: '', body: 'Delete this' });
  const pending = editor.flush();
  await editor.discard();
  await pending;
  await jest.runOnlyPendingTimersAsync();
  expect(await notes.list()).toEqual([]);
});

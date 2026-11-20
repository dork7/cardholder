import { isBlankNote, Note, NoteFields, NoteStore } from './noteStore';

export interface NoteEditor {
  id: string;
  change(fields: NoteFields): void;
  flush(): Promise<void>;
  finish(): Promise<void>;
  discard(): Promise<void>;
  subscribe(listener: () => void): () => void;
  status(): 'saving' | 'saved' | 'error';
}

// Lives with the services so backup can flush every open editor before taking its snapshot.
export function createNoteEditors(store: NoteStore) {
  const open = new Set<NoteEditor>();
  return {
    open(note: Note | null): NoteEditor {
      const id = note?.id ?? store.newId();
      let fields: NoteFields = note ? { title: note.title, body: note.body, ...(note.spaceId !== undefined && { spaceId: note.spaceId }) } : { title: '', body: '' };
      let revision = 0;
      let savedRevision = 0;
      let pending: Promise<void> | null = null;
      let failed = false;
      let closed = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const listeners = new Set<() => void>();
      const notify = () => listeners.forEach((listener) => listener());
      const cancelTimer = () => { clearTimeout(timer); timer = undefined; };
      const flush = (): Promise<void> => {
        cancelTimer();
        if (pending) return pending;
        if (closed || revision === savedRevision) return Promise.resolve();
        failed = false;
        pending = (async () => {
          while (savedRevision !== revision) {
            const writing = revision;
            const snapshot = { ...fields };
            // A blank intermediate edit stays in memory until finish. It must not delete a note
            // while the user selects all and types replacement text.
            if (!isBlankNote(snapshot)) await store.save(id, snapshot);
            savedRevision = writing;
          }
        })().catch(() => {
          failed = true;
          throw new Error('Note save failed'); // Never propagate user text through diagnostics.
        }).finally(() => {
          pending = null;
          notify();
        });
        notify();
        return pending;
      };
      const editor: NoteEditor = {
        id,
        change(next) {
          if (closed) return;
          fields = { ...next };
          revision++;
          failed = false;
          cancelTimer();
          timer = setTimeout(() => { void flush().catch(() => {}); }, 300);
          notify();
        },
        flush,
        async finish() {
          cancelTimer();
          await flush();
          if (isBlankNote(fields)) await store.remove(id);
          closed = true;
          open.delete(editor);
        },
        async discard() {
          cancelTimer();
          // Wait for a running save, including a failed one, before deleting permanently.
          await pending?.catch(() => {});
          await store.remove(id);
          closed = true;
          open.delete(editor);
        },
        subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
        status: () => failed ? 'error' : pending || savedRevision !== revision ? 'saving' : 'saved',
      };
      open.add(editor);
      return editor;
    },
    async flushAll() {
      for (const editor of open) await editor.flush();
    },
  };
}

export type NoteEditors = ReturnType<typeof createNoteEditors>;

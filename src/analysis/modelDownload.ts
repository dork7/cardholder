import { useSyncExternalStore } from 'react';
import { deleteModel, downloadModel, modelFile, ModelCheckError, NoSpaceError } from './gemma';

// The AI model's one-time download, which only runs when the user starts it in Settings. Kept out of
// the screen, so it carries on if the user leaves Settings and is still showing when they come back.

export type ModelFailure = 'network' | 'space' | 'check';

export type ModelState =
  | { status: 'absent'; failure?: ModelFailure }
  | { status: 'downloading'; progress: number | null } // 0–1, null while the size is unknown
  | { status: 'present' };

let state: ModelState | null = null;
let abort: AbortController | null = null;
const listeners = new Set<() => void>();

// Outside a download, the file on disk is the truth (the development test bench can add or delete it
// too). The same object comes back while nothing changes, as useSyncExternalStore needs.
function current(): ModelState {
  if (state?.status === 'downloading') return state;
  const present = modelFile().exists;
  if (present && state?.status !== 'present') state = { status: 'present' };
  if (!present && state?.status !== 'absent') state = { status: 'absent' };
  return state!;
}

function set(next: ModelState) {
  state = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useModelState(): ModelState {
  return useSyncExternalStore(subscribe, current);
}

export async function startModelDownload(): Promise<void> {
  if (current().status !== 'absent') return;
  const controller = new AbortController();
  abort = controller;
  set({ status: 'downloading', progress: 0 });
  // Whole percents only: the download reports far more often than the screen needs.
  let shown = 0;
  try {
    await downloadModel((fraction) => {
      const percent = fraction === null ? null : Math.floor(fraction * 100);
      if (percent !== null && percent === shown) return;
      shown = percent ?? -1;
      set({ status: 'downloading', progress: percent === null ? null : percent / 100 });
    }, controller.signal);
    set({ status: 'present' });
  } catch (e) {
    if (controller.signal.aborted) {
      set({ status: 'absent' });
      return;
    }
    console.warn('Downloading the AI model failed', e);
    set({ status: 'absent', failure: e instanceof NoSpaceError ? 'space' : e instanceof ModelCheckError ? 'check' : 'network' });
  } finally {
    if (abort === controller) abort = null;
  }
}

export function cancelModelDownload(): void {
  abort?.abort();
}

export async function removeModel(): Promise<void> {
  await deleteModel();
  set({ status: 'absent' });
}

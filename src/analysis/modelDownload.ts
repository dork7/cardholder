import { useSyncExternalStore } from 'react';
import { CATALOG, entry, LocalModelId } from '../ai/catalog';
import { AskWith } from '../ai/localModelPrefs';
import {
  backgroundDownloadState,
  deleteModel,
  downloadModel,
  dropBackgroundDownload,
  isDownloaded,
  ModelCheckError,
  NoSpaceError,
  onGpu,
  onLoadChange,
  prefs,
  releaseLocalModel,
} from './localModel';

// The AI models' downloads, which only run when the user starts one in Settings, and which one is in
// use. Kept out of the screen, so a download carries on if the user leaves Settings and is still
// showing when they come back. One download at a time: they are hundreds of MB each.

export type ModelFailure = 'network' | 'space' | 'check';

export type ModelState =
  | { status: 'absent'; failure?: ModelFailure }
  | { status: 'downloading'; progress: number | null } // 0–1, null while the size is unknown
  | { status: 'present' };

export interface MenuState {
  models: Record<LocalModelId, ModelState>;
  downloading: LocalModelId | null;
  onGpu: boolean | null; // where the model in use runs; null until known
  active: LocalModelId | null;
  askWith: AskWith;
}

let downloading: { id: LocalModelId; progress: number | null; abort: AbortController } | null = null;
const failures: Partial<Record<LocalModelId, ModelFailure>> = {};
let state: MenuState | null = null;
let stateKey = '';
const listeners = new Set<() => void>();

// Outside a download, the files on disk and the prefs file are the truth (the development bench can
// change them too). The same object comes back while nothing changes, as useSyncExternalStore needs.
function current(): MenuState {
  const models = {} as Record<LocalModelId, ModelState>;
  for (const { id } of CATALOG) {
    const failure = failures[id];
    models[id] =
      downloading?.id === id
        ? { status: 'downloading', progress: downloading.progress }
        : isDownloaded(id)
          ? { status: 'present' }
          : failure
            ? { status: 'absent', failure }
            : { status: 'absent' };
  }
  const { active, askWith } = prefs.get();
  const next: MenuState = { models, downloading: downloading?.id ?? null, onGpu: onGpu(), active, askWith };
  const key = JSON.stringify(next);
  if (key !== stateKey) {
    state = next;
    stateKey = key;
  }
  return state!;
}

// Tells the screens to look again, after anything changed.
export function refresh(): void {
  current();
  for (const listener of listeners) listener();
}

// Loading or freeing the model changes where it runs.
onLoadChange(refresh);

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useMenuState(): MenuState {
  return useSyncExternalStore(subscribe, current);
}

export async function startModelDownload(id: LocalModelId): Promise<void> {
  if (downloading || isDownloaded(id)) return;
  const abort = new AbortController();
  downloading = { id, progress: 0, abort };
  delete failures[id];
  refresh();
  // Whole percents only: the download reports far more often than the screen needs.
  let shown = 0;
  try {
    await downloadModel(
      entry(id)!,
      (fraction) => {
        const percent = fraction === null ? null : Math.floor(fraction * 100);
        if (percent !== null && percent === shown) return;
        shown = percent ?? -1;
        if (downloading?.abort === abort) downloading.progress = percent === null ? null : percent / 100;
        refresh();
      },
      abort.signal,
    );
    // The first model downloaded is the one in use; later ones wait until the user picks them. The
    // choice is saved, so a later download earlier in the catalogue doesn't take over.
    prefs.update({ active: prefs.get().active ?? id });
  } catch (e) {
    if (!abort.signal.aborted) {
      console.warn('Downloading the AI model failed', e);
      failures[id] = e instanceof NoSpaceError ? 'space' : e instanceof ModelCheckError ? 'check' : 'network';
    }
  } finally {
    if (downloading?.abort === abort) downloading = null;
    refresh();
  }
}

// At launch: a download Android carried on with (or finished) while the app was closed is picked back
// up, so its model is put in place without the user opening Settings. One that failed meanwhile is
// only reported: starting it again is the user's call (ADR 0005).
export function resumeModelDownloads(): void {
  for (const e of CATALOG) {
    if (isDownloaded(e.id)) continue;
    let found: ReturnType<typeof backgroundDownloadState>;
    try {
      found = backgroundDownloadState(e);
    } catch (err) {
      console.warn('Looking for a model download under way failed', err);
      return;
    }
    if (found === 'failed') {
      dropBackgroundDownload(e);
      failures[e.id] = 'network';
      refresh();
    } else if (found !== 'none' && !downloading) {
      void startModelDownload(e.id);
    }
  }
}

export function cancelModelDownload(id: LocalModelId): void {
  if (downloading?.id === id) downloading.abort.abort();
}

// The next card read or question loads the chosen model; the old one is freed now.
export async function setActive(id: LocalModelId): Promise<void> {
  if (!isDownloaded(id)) throw new Error(`${id} is not downloaded`);
  prefs.update({ active: id });
  refresh();
  await releaseLocalModel();
}

export function setAskWith(askWith: AskWith): void {
  prefs.update({ askWith });
  refresh();
}

export async function removeModel(id: LocalModelId): Promise<void> {
  try {
    await deleteModel(id);
  } finally {
    refresh();
  }
}

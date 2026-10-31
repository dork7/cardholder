import { useSyncExternalStore } from 'react';
import {
  BadReleaseError,
  canInstall,
  downloadApk,
  fetchManifest,
  install,
  installedVersionCode,
  openInstallPermission,
  UpdateCheckError,
} from './download';
import { isNewer, UpdateManifest } from './manifest';

// Updating the app from Settings. Nothing happens until the user taps Check; kept out of the screen
// so a download carries on if they leave Settings and is still showing when they come back.

export type UpdateFailure = 'network' | 'bad-release' | 'check' | 'install';

export type UpdateState =
  | { status: 'idle'; failure?: UpdateFailure }
  | { status: 'checking' }
  | { status: 'up-to-date' }
  | { status: 'available'; manifest: UpdateManifest; failure?: UpdateFailure }
  | { status: 'downloading'; manifest: UpdateManifest; progress: number | null } // 0–1, null while unknown
  | { status: 'ready'; manifest: UpdateManifest; file: string; needsPermission: boolean };

let state: UpdateState = { status: 'idle' };
let abort: AbortController | null = null;
const listeners = new Set<() => void>();

function set(next: UpdateState) {
  state = next;
  for (const listener of listeners) listener();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useUpdateState = (): UpdateState => useSyncExternalStore(subscribe, () => state);

export function getUpdateState(): UpdateState {
  return state;
}

export async function checkForUpdate(): Promise<void> {
  if (state.status === 'checking' || state.status === 'downloading') return;
  set({ status: 'checking' });
  try {
    const manifest = await fetchManifest();
    set(isNewer(manifest, installedVersionCode()) ? { status: 'available', manifest } : { status: 'up-to-date' });
  } catch (e) {
    console.warn('Checking for an update failed', e);
    set({ status: 'idle', failure: e instanceof BadReleaseError ? 'bad-release' : 'network' });
  }
}

export async function downloadUpdate(): Promise<void> {
  if (state.status !== 'available') return;
  const { manifest } = state;
  const controller = new AbortController();
  abort = controller;
  set({ status: 'downloading', manifest, progress: 0 });
  // Whole percents only: the download reports far more often than the screen needs.
  let shown = 0;
  try {
    const file = await downloadApk(
      manifest,
      (fraction) => {
        const percent = fraction === null ? null : Math.floor(fraction * 100);
        if (percent !== null && percent === shown) return;
        shown = percent ?? -1;
        set({ status: 'downloading', manifest, progress: percent === null ? null : percent / 100 });
      },
      controller.signal,
    );
    set({ status: 'ready', manifest, file, needsPermission: !canInstall() });
  } catch (e) {
    if (controller.signal.aborted) {
      set({ status: 'available', manifest });
      return;
    }
    console.warn('Downloading the update failed', e);
    set({ status: 'available', manifest, failure: e instanceof UpdateCheckError ? 'check' : 'network' });
  } finally {
    if (abort === controller) abort = null;
  }
}

export function cancelUpdateDownload(): void {
  abort?.abort();
}

// Opens Android's installer, which asks the user to confirm. The first time, Android needs the user to
// allow installs from Doc Keeper; this opens that page instead, and Install works once they're back.
export function installUpdate(): void {
  if (state.status !== 'ready') return;
  if (!canInstall()) {
    set({ ...state, needsPermission: true });
    openInstallPermission();
    return;
  }
  try {
    install(state.file);
  } catch (e) {
    console.warn('Opening the installer failed', e);
    set({ status: 'available', manifest: state.manifest, failure: 'install' });
  }
}

// Called when Settings comes back into view: the user may have just allowed installs.
export function refreshInstallPermission(): void {
  if (state.status === 'ready' && state.needsPermission && canInstall()) set({ ...state, needsPermission: false });
}

// For tests: back to the start.
export function resetUpdateState(): void {
  abort?.abort();
  abort = null;
  set({ status: 'idle' });
}

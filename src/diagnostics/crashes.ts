import { useSyncExternalStore } from 'react';
import { DiagnosticsFiles } from './files';
import { describeError, Logger } from './log';

// What the app keeps about its last unexpected close, and how it finds out about it on the next
// launch. Nothing here leaves the phone: report.ts turns a record into text the user can choose to
// send. Four sources, checked in order:
//   1. crash.json         written by the JavaScript error handler below, before the app goes down
//   2. native-crash.txt   written by modules/crash-log when Kotlin or Swift code throws
//   3. the system's exit reasons (Android 11+), which also know native crashes and ANRs
//   4. the `running` marker: on iOS (no exit reasons) the app was in front and never went to the
//      background before this launch, so it most likely died

export type CrashKind = 'js' | 'native' | 'anr' | 'unexpected-exit';

export interface CrashRecord {
  at: number;
  kind: CrashKind;
  // One line: the error's name and message, or what the system said.
  message: string;
  // The stack or trace, possibly empty.
  detail: string;
}

export interface NativeExit {
  at: number;
  reason: 'crash' | 'native-crash' | 'anr' | 'other';
  description: string;
  trace: string;
}

export interface CrashNative {
  // Android 11 and later: the system's record of why the app last stopped. Elsewhere null.
  lastExits: ((sinceMs: number) => NativeExit[]) | null;
}

export const CRASH_FILE = 'crash.json';
export const NATIVE_CRASH_FILE = 'native-crash.txt';
export const RUNNING_MARKER = 'running';
export const PENDING_FILE = 'pending.json';
const EXITS_SEEN_FILE = 'exits-seen.json';

type ErrorHandler = (error: unknown, isFatal: boolean) => void;

interface ErrorUtilsLike {
  getGlobalHandler(): ErrorHandler;
  setGlobalHandler(handler: ErrorHandler): void;
}

interface RejectionTracking {
  enablePromiseRejectionTracker?: (options: {
    allRejections: boolean;
    onUnhandled: (id: number, rejection: unknown) => void;
    onHandled: (id: number) => void;
  }) => void;
}

export interface CrashHandlerDeps {
  files: DiagnosticsFiles;
  logger: Logger;
  errorUtils: ErrorUtilsLike;
  hermes?: RejectionTracking | null;
  // React Native's own rejection reporting, kept so development still shows the yellow box.
  defaultRejectionHandler?: (id: number, rejection: unknown) => void;
  now?: () => number;
}

export function toRecord(error: unknown, kind: CrashKind, at: number): CrashRecord {
  const described = describeError(error);
  const [message, ...rest] = described.split('\n');
  return { at, kind, message: message || 'Unknown error', detail: rest.join('\n') };
}

// Keeps a record of a fatal JavaScript error before React Native tears the app down, and logs
// unhandled promise rejections (those don't crash the app). Returns an undo for tests.
export function installCrashHandlers(deps: CrashHandlerDeps): () => void {
  const { files, logger, errorUtils, hermes, defaultRejectionHandler, now = Date.now } = deps;
  const previous = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((error, isFatal) => {
    if (!isFatal) {
      logger.error('Unhandled error', error);
      previous(error, isFatal);
      return;
    }
    logger.error('Fatal error', error);
    const record = toRecord(error, 'js', now());
    // The write has to land before the previous handler kills the app; a slow disk is not worth
    // hanging a crashing app on, so a second is the most it waits.
    const saved = Promise.all([files.write(CRASH_FILE, JSON.stringify(record)), logger.flush()]).catch(() => {});
    const timeout = new Promise<void>((resolve) => setTimeout(resolve, 1000));
    void Promise.race([saved, timeout]).then(() => previous(error, isFatal));
  });

  hermes?.enablePromiseRejectionTracker?.({
    allRejections: true,
    onUnhandled: (id, rejection) => {
      logger.error('Unhandled promise rejection', rejection);
      defaultRejectionHandler?.(id, rejection);
    },
    onHandled: () => {},
  });

  return () => errorUtils.setGlobalHandler(previous);
}

// The `running` marker: present while the app is in front. On iOS a launch that finds it means the
// last run ended without going to the background first, which is what a crash looks like. It is
// cleared on inactive as well as background, so a swipe-away in the app switcher (inactive, then
// killed) isn't mistaken for one; the price is missing a crash in the moments after a call comes in.
export async function markRunning(files: DiagnosticsFiles, running: boolean): Promise<void> {
  if (running) await files.write(RUNNING_MARKER, '1');
  else files.remove(RUNNING_MARKER);
}

export interface PendingCrash {
  record: CrashRecord;
  // Whether the launch prompt has asked about this one, so "Not now" means not again.
  prompted: boolean;
}

export function readPending(files: DiagnosticsFiles): PendingCrash | null {
  const text = files.read(PENDING_FILE);
  if (text === null) return null;
  try {
    const parsed = JSON.parse(text) as PendingCrash;
    return parsed && parsed.record && typeof parsed.record.at === 'number' ? parsed : null;
  } catch {
    return null;
  }
}

// Reads every source for a crash since the last launch, keeps the newest as the pending one (unless
// an older one is still waiting to be sent), and clears the sources so the next launch starts clean.
// `wasRunning` is whether the marker was found before this launch set it again.
export async function collectCrash(
  files: DiagnosticsFiles,
  native: CrashNative,
  options: { wasRunning: boolean; useMarker: boolean; now?: () => number },
): Promise<PendingCrash | null> {
  const now = options.now ?? Date.now;
  const found: CrashRecord[] = [];

  const js = files.read(CRASH_FILE);
  if (js !== null) {
    files.remove(CRASH_FILE);
    try {
      const record = JSON.parse(js) as CrashRecord;
      if (record && typeof record.at === 'number' && typeof record.message === 'string') found.push(record);
    } catch {
      // A half-written file from a crash mid-write: nothing to keep.
    }
  }

  const nativeText = files.read(NATIVE_CRASH_FILE);
  if (nativeText !== null) {
    files.remove(NATIVE_CRASH_FILE);
    const record = parseNativeCrash(nativeText, now());
    // On Android a fatal JavaScript error is rethrown natively too, so the same crash arrives twice;
    // the JavaScript record names the line, so it is the one kept.
    if (!found.some((js) => Math.abs(js.at - record.at) < 60_000)) found.push(record);
  }

  if (native.lastExits) {
    const seenAt = readSeenAt(files);
    const exits = native.lastExits(seenAt).filter((exit) => exit.reason !== 'other' && exit.at > seenAt);
    if (exits.length > 0) {
      const newest = exits.reduce((a, b) => (a.at > b.at ? a : b));
      await files.write(EXITS_SEEN_FILE, JSON.stringify({ seenAt: newest.at }));
      // A JS crash is also a system "crash": the JS record says more, so keep that one.
      if (!found.some((record) => Math.abs(record.at - newest.at) < 60_000)) {
        found.push({
          at: newest.at,
          kind: newest.reason === 'anr' ? 'anr' : 'native',
          message: newest.description || (newest.reason === 'anr' ? 'The app stopped responding' : 'The app crashed'),
          detail: newest.trace,
        });
      }
    }
  } else if (options.useMarker && options.wasRunning && found.length === 0) {
    found.push({ at: now(), kind: 'unexpected-exit', message: 'The app closed while it was open', detail: '' });
  }

  const existing = readPending(files);
  if (found.length === 0) return existing;
  const newest = found.reduce((a, b) => (a.at > b.at ? a : b));
  const pending: PendingCrash = { record: existing && existing.record.at > newest.at ? existing.record : newest, prompted: false };
  await files.write(PENDING_FILE, JSON.stringify(pending));
  return pending;
}

// modules/crash-log writes the time on the first line (milliseconds since the epoch), the error on
// the second, and the stack after that.
export function parseNativeCrash(text: string, fallbackAt: number): CrashRecord {
  const [first = '', second = '', ...rest] = text.split('\n');
  const at = Number(first);
  return {
    at: Number.isFinite(at) && at > 0 ? at : fallbackAt,
    kind: 'native',
    message: second.trim() || 'Native crash',
    detail: rest.join('\n').trim(),
  };
}

function readSeenAt(files: DiagnosticsFiles): number {
  try {
    const parsed = JSON.parse(files.read(EXITS_SEEN_FILE) ?? '{}') as { seenAt?: number };
    return typeof parsed.seenAt === 'number' ? parsed.seenAt : 0;
  } catch {
    return 0;
  }
}

// ---------- The pending crash, for the screens ----------
// One per app: Settings shows it, the launch prompt asks about it, sending or dismissing clears it.

let pending: PendingCrash | null = null;
let pendingFiles: DiagnosticsFiles | null = null;
const listeners = new Set<() => void>();

function set(next: PendingCrash | null) {
  pending = next;
  for (const listener of listeners) listener();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const usePendingCrash = (): PendingCrash | null => useSyncExternalStore(subscribe, () => pending);

export function getPendingCrash(): PendingCrash | null {
  return pending;
}

export function setPendingCrash(files: DiagnosticsFiles, next: PendingCrash | null): void {
  pendingFiles = files;
  set(next);
}

// Remembers that the launch prompt has shown this crash, so it isn't asked about again.
export async function markPrompted(): Promise<void> {
  if (!pending || !pendingFiles) return;
  const next = { ...pending, prompted: true };
  set(next);
  await pendingFiles.write(PENDING_FILE, JSON.stringify(next));
}

export function dismissCrash(): void {
  pendingFiles?.remove(PENDING_FILE);
  set(null);
}

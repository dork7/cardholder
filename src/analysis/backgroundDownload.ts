import { requireOptionalNativeModule } from 'expo';

// Android's download manager, through modules/model-download: a model download handed to it carries
// on with the app closed or the phone locked, and waits out a dropped connection. Absent on iPhone, in
// builds made before the module, and in tests; there the app downloads the file itself.

export interface BackgroundStatus {
  state: 'none' | 'running' | 'done' | 'failed';
  bytes: number;
  total: number; // -1 until the size is known
  reason: number; // the download manager's error code when failed
}

export interface BackgroundDownloader {
  start(url: string, fileName: string, title: string): void; // does nothing if already under way or done
  status(fileName: string): BackgroundStatus;
  cancel(fileName: string): void;
  moveTo(fileName: string, destUri: string): Promise<void>; // a finished download, into the app's own storage
}

export const backgroundDownloader = requireOptionalNativeModule<BackgroundDownloader>('ModelDownload');

export class BackgroundNoSpaceError extends Error {}

const NO_SPACE = 1006; // DownloadManager.ERROR_INSUFFICIENT_SPACE
const POLL_MS = 500;

export interface BackgroundJob {
  url: string;
  fileName: string;
  title: string;
  destUri: string; // where the whole file is put
  beforeStart?: () => void; // runs only when a new download is about to start (the free-space check)
  beforeMove?: () => void;
  onProgress?: (fraction: number | null) => void;
  signal?: AbortSignal;
  wait?: (ms: number) => Promise<void>;
}

// Starts the download, or picks up one already under way (the app was closed meanwhile), follows it
// until the file is whole, and moves it to `destUri`. Stopping removes it.
export async function downloadInBackground(native: BackgroundDownloader, job: BackgroundJob): Promise<void> {
  const { fileName, signal } = job;
  const wait = job.wait ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const before = native.status(fileName).state;
  if (before === 'none' || before === 'failed') {
    job.beforeStart?.();
    native.start(job.url, fileName, job.title);
  }
  for (;;) {
    if (signal?.aborted) {
      native.cancel(fileName);
      throw new Error('The download was stopped');
    }
    const s = native.status(fileName);
    if (s.state === 'done') break;
    if (s.state === 'failed') {
      native.cancel(fileName);
      if (s.reason === NO_SPACE) throw new BackgroundNoSpaceError('Not enough free space');
      throw new Error(`The download failed (${s.reason})`);
    }
    // Removed from outside the app, from the system's Downloads list for instance.
    if (s.state === 'none') throw new Error('The download was removed');
    job.onProgress?.(s.total > 0 ? s.bytes / s.total : null);
    await wait(POLL_MS);
  }
  job.beforeMove?.();
  await native.moveTo(fileName, job.destUri);
}

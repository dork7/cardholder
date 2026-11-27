import { CardStore } from '../../cards/cardStore';
import { DRIVE_BACKUPS_KEPT, DRIVE_FOLDER_NAME, DRIVE_OVERDUE_DAYS, MIN_DRIVE_PASSPHRASE_LENGTH } from '../../config';
import { NoteStore } from '../../notes/noteStore';
import { Settings } from '../../storage/settings';
import { BackupFrequency, backupInterval } from '../autoBackup';
import { encodeBackup } from '../backupFile';
import { buildSnapshot } from '../backupService';
import { recordExport } from '../lastExport';
import { DriveClient, DriveError, DriveFile } from './driveApi';
import { GoogleAuth } from './googleAuth';

// Automatic backup to the user's own Google Drive (ADR-0010). The same passphrase-encrypted file as
// the folder backup, uploaded to a visible "Doc Keeper Backups" folder. Runs on the shared background
// task; never fails silently: a streak of failures (or Wi-Fi never turning up) past
// DRIVE_OVERDUE_DAYS raises one notification.

// What the user needs to do about the last failed run, shown on the backup screens.
export type DriveProblem = 'reconnect' | 'full' | 'failed';

export interface DriveBackupConfig {
  frequency: BackupFrequency;
  allowMobileData: boolean;
  email: string;
  folderId: string;
  files: string[]; // Drive ids of the backups this setup uploaded, oldest first. Only these are ever deleted.
  lastRun: number; // start of the last successful backup
  problem: DriveProblem | null;
  warnedAt: number | null; // the overdue notification for the current streak, so it is shown once
}

export type RunResult = 'done' | 'not-due' | 'waiting-for-wifi' | 'failed' | 'off';

interface Dependencies {
  store: CardStore;
  notes: NoteStore;
  settings: Settings;
  auth: GoogleAuth;
  // Builds a Drive client around a token source; the real one is createDriveClient with fetch.
  connect(token: (fresh: boolean) => Promise<string>): DriveClient;
  secret: { get(): Promise<string | null>; set(value: string | null): Promise<void> };
  schedule(): Promise<void>; // re-register the shared background task for whatever is switched on
  notifyOverdue(problem: DriveProblem | 'waiting-for-wifi'): Promise<void>;
  now?: () => number;
}

const KEY = 'driveBackup';
const DAY = 86_400_000;

export async function loadDriveBackup(settings: Settings): Promise<DriveBackupConfig | null> {
  const raw = await settings.get(KEY);
  if (!raw) return null;
  const config = JSON.parse(raw) as DriveBackupConfig;
  if (!['daily', 'weekly'].includes(config.frequency) || typeof config.folderId !== 'string' ||
      !Number.isFinite(config.lastRun) || !Array.isArray(config.files) || config.files.some((id) => typeof id !== 'string')) {
    throw new Error('Invalid Drive backup settings');
  }
  return config;
}

export const driveProblemFor = (error: unknown): DriveProblem =>
  error instanceof DriveError ? error.kind === 'auth' ? 'reconnect' : error.kind === 'quota' ? 'full' : 'failed' : 'failed';

export const isStrongEnough = (passphrase: string) => [...passphrase].length >= MIN_DRIVE_PASSPHRASE_LENGTH;

// One queue for setup, scheduled runs and turning off in this JS runtime.
let pending: Promise<unknown> = Promise.resolve();
function exclusive<T>(work: () => Promise<T>): Promise<T> {
  const result = pending.then(work);
  pending = result.catch(() => {});
  return result;
}

export function createDriveBackup(deps: Dependencies) {
  const { settings, auth, secret } = deps;
  const now = deps.now ?? Date.now;
  const persist = (config: DriveBackupConfig) => settings.set(KEY, JSON.stringify(config));

  // interactive: the first token may show Google's account chooser. Later tokens never do.
  const tokens = (interactive: boolean) => {
    let last: string | null = null;
    let first = true;
    return async (fresh: boolean) => {
      if (fresh && last) await auth.clearToken(last);
      const result = await auth.authorize(interactive && first);
      first = false;
      if (result.status === 'ok') return (last = result.accessToken);
      throw new DriveError(result.status === 'cancelled' ? 'cancelled' : result.status === 'unavailable' ? 'unavailable' : 'auth');
    };
  };

  const folderFor = async (drive: DriveClient) =>
    (await drive.findFolder(DRIVE_FOLDER_NAME)) ?? drive.createFolder(DRIVE_FOLDER_NAME);

  // Uploads one backup and prunes this setup's older ones. Ownership is saved before pruning, so a
  // failed delete is retried after the next upload.
  async function upload(drive: DriveClient, config: DriveBackupConfig, passphrase: string) {
    if (!(await drive.folderExists(config.folderId))) {
      // The user deleted or trashed the folder: its backups went with it.
      config.folderId = await folderFor(drive);
      config.files = [];
    }
    const at = now(); // Snapshot start, so edits made during the upload still count as new changes.
    const bytes = await encodeBackup(await buildSnapshot(deps.store, at, deps.notes), passphrase);
    const id = await drive.upload(config.folderId, `DocKeeper-${new Date(at).toISOString().slice(0, 10)}-${at}.cardholder`, bytes);
    config.files.push(id);
    config.lastRun = at;
    config.problem = null;
    config.warnedAt = null;
    await persist(config);
    await recordExport(settings, at);
    while (config.files.length > DRIVE_BACKUPS_KEPT) {
      await drive.remove(config.files[0]);
      config.files.shift();
      await persist(config);
    }
  }

  // Past the overdue mark without a successful backup: warn once per streak.
  async function checkOverdue(config: DriveBackupConfig, reason: DriveProblem | 'waiting-for-wifi') {
    if (config.warnedAt !== null || now() - config.lastRun < DRIVE_OVERDUE_DAYS * DAY) return;
    config.warnedAt = now();
    await persist(config);
    await deps.notifyOverdue(reason).catch(() => {});
  }

  async function run(force: boolean, interactive: boolean): Promise<RunResult> {
    const config = await loadDriveBackup(settings);
    if (!config) return 'off';
    if (!force && now() - config.lastRun < backupInterval(config.frequency) * 60_000) return 'not-due';
    if (!config.allowMobileData && !auth.isOnUnmeteredNetwork()) {
      await checkOverdue(config, 'waiting-for-wifi');
      return 'waiting-for-wifi';
    }
    try {
      const passphrase = await secret.get();
      if (!passphrase) throw new Error('Drive backup passphrase unavailable');
      await upload(deps.connect(tokens(interactive)), config, passphrase);
      return 'done';
    } catch (error) {
      if (error instanceof DriveError && error.kind === 'cancelled') throw error;
      config.problem = driveProblemFor(error);
      await persist(config);
      await checkOverdue(config, config.problem);
      return 'failed';
    }
  }

  return {
    // Shows Google's account chooser, then saves the first backup before reporting success.
    // Resolves 'cancelled' when the user backs out of the chooser; nothing is switched on then.
    enable: (setup: { frequency: BackupFrequency; allowMobileData: boolean; passphrase: string }) => exclusive(async () => {
      if (!isStrongEnough(setup.passphrase)) throw new Error('Drive backup passphrase too short');
      if (await loadDriveBackup(settings)) throw new Error('Turn off Drive backup before changing setup');
      const drive = deps.connect(tokens(true));
      try {
        const email = await drive.userEmail();
        const config: DriveBackupConfig = {
          frequency: setup.frequency, allowMobileData: setup.allowMobileData, email,
          folderId: await folderFor(drive), files: [], lastRun: 0, problem: null, warnedAt: null,
        };
        await secret.set(setup.passphrase);
        await upload(drive, config, setup.passphrase);
        await deps.schedule();
        return 'enabled' as const;
      } catch (error) {
        await settings.remove(KEY);
        await secret.set(null);
        if (error instanceof DriveError && error.kind === 'cancelled') return 'cancelled' as const;
        throw error;
      }
    }),
    // Scheduled and catch-up runs: no UI, only when due.
    run: () => exclusive(() => run(false, false)),
    // "Back up now" from the backup screen.
    runNow: () => exclusive(() => run(true, false)),
    // After access was removed in the Google account: the account chooser again, then a backup.
    reconnect: () => exclusive(() => run(true, true)),
    setAllowMobileData: (allow: boolean) => exclusive(async () => {
      const config = await loadDriveBackup(settings);
      if (config) await persist({ ...config, allowMobileData: allow });
    }),
    // deleteBackups: also remove this setup's files (and the folder, once empty) from Drive.
    disable: (deleteBackups: boolean) => exclusive(async () => {
      const config = await loadDriveBackup(settings);
      if (config) {
        const drive = deps.connect(tokens(deleteBackups));
        if (deleteBackups) {
          for (const id of [...config.files]) {
            await drive.remove(id);
            config.files.shift();
            await persist(config);
          }
          if (await drive.folderExists(config.folderId) && (await drive.list(config.folderId)).length === 0) {
            await drive.remove(config.folderId);
          }
        }
        await drive.revoke();
      }
      await settings.remove(KEY);
      await secret.set(null);
      await deps.schedule();
    }),
  };
}

// Restoring on a new phone: no setup needed, only the account chooser.
export function createDriveRestore(deps: Pick<Dependencies, 'auth' | 'connect'>) {
  let first = true;
  let last: string | null = null;
  const drive = deps.connect(async (fresh) => {
    if (fresh && last) await deps.auth.clearToken(last);
    const result = await deps.auth.authorize(first);
    first = false;
    if (result.status === 'ok') return (last = result.accessToken);
    throw new DriveError(result.status === 'cancelled' ? 'cancelled' : result.status === 'unavailable' ? 'unavailable' : 'auth');
  });
  const client = () => drive;
  return {
    // Newest first. Only .cardholder files in the backup folder; [] when there is no folder.
    async listBackups(): Promise<DriveFile[]> {
      const folder = await client().findFolder(DRIVE_FOLDER_NAME);
      if (!folder) return [];
      return (await client().list(folder)).filter((file) => file.name.endsWith('.cardholder'));
    },
    download: (id: string) => client().download(id),
  };
}

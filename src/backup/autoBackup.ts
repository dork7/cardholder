import { CardStore } from '../cards/cardStore';
import { NoteStore } from '../notes/noteStore';
import { Settings } from '../storage/settings';
import { encodeBackup } from './backupFile';
import { buildSnapshot } from './backupService';
import { recordExport } from './lastExport';
import { toIsoDate } from '../time/dates';

// A dated name like a manual backup's, with the time so two in a day don't collide (#98).
export function autoBackupName(at: number): string {
  const d = new Date(at);
  const time = `${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
  return `DocKeeper-auto-${toIsoDate(d)}-${time}.cardholder`;
}

export type BackupFrequency = 'daily' | 'weekly';
export interface AutoBackupConfig {
  frequency: BackupFrequency;
  enabled?: boolean;
  folder: string;
  lastRun: number;
  files: string[]; // Only files this setup wrote; never prune manual exports or other files.
}
interface Dependencies {
  store: CardStore;
  notes: NoteStore;
  settings: Settings;
  secret: { get(): Promise<string | null>; set(value: string | null): Promise<void> };
  destination: {
    write(folder: string, name: string, bytes: Uint8Array): Promise<string>;
    remove(uri: string): Promise<void>;
  };
  schedule(minutes: number | null): Promise<void>;
  now?: () => number;
}
export const backupInterval = (frequency: BackupFrequency) => frequency === 'daily' ? 1440 : 10080;

export async function loadAutoBackup(settings: Settings, includeDisabled = false): Promise<AutoBackupConfig | null> {
  const raw = await settings.get('autoBackup');
  if (!raw) return null;
  const config: AutoBackupConfig = JSON.parse(raw);
  if (!['daily', 'weekly'].includes(config.frequency) || typeof config.folder !== 'string' ||
      !Number.isFinite(config.lastRun) || !Array.isArray(config.files) || config.files.some((uri) => typeof uri !== 'string')) {
    throw new Error('Invalid auto-backup settings');
  }
  return config.enabled === false && !includeDisabled ? null : config;
}

// One queue shared by foreground setup and background execution in this JS runtime.
let pending: Promise<unknown> = Promise.resolve();
function exclusive<T>(work: () => Promise<T>): Promise<T> {
  const result = pending.then(work);
  pending = result.catch(() => {});
  return result;
}

export function createAutoBackup(deps: Dependencies) {
  const { settings, secret, destination, schedule } = deps;
  const now = deps.now ?? Date.now;
  const save = async (config: AutoBackupConfig, passphrase: string) => {
    const at = now(); // Snapshot start, so edits made during a write still count as new changes.
    const bytes = await encodeBackup(await buildSnapshot(deps.store, at, deps.notes), passphrase);
    const uri = await destination.write(config.folder, autoBackupName(at), bytes);
    config.files.push(uri);
    config.lastRun = at;
    // Persist ownership before pruning. A failed prune is retried after the next successful save.
    await settings.set('autoBackup', JSON.stringify(config));
    await recordExport(settings, at);
    while (config.files.length > 7) {
      await destination.remove(config.files[0]);
      config.files.shift();
      await settings.set('autoBackup', JSON.stringify(config));
    }
    await settings.remove('autoBackupError');
  };
  const disable = async () => {
    const config = await loadAutoBackup(settings, true);
    // Keep ownership while off, so enabling again in the same folder can still prune old files.
    if (config) await settings.set('autoBackup', JSON.stringify({ ...config, enabled: false }));
    await secret.set(null);
    await settings.remove('autoBackupError');
    await schedule(null);
  };
  return {
    enable: (frequency: BackupFrequency, folder: string, passphrase: string) => exclusive(async () => {
      if (await loadAutoBackup(settings)) throw new Error('Turn off auto-backup before changing setup');
      try {
        const previous = await loadAutoBackup(settings, true);
        await secret.set(passphrase);
        await save({ frequency, folder, lastRun: 0, files: previous?.folder === folder ? previous.files : [] }, passphrase);
        await schedule(backupInterval(frequency));
      } catch (error) {
        await disable();
        throw error;
      }
    }),
    disable: () => exclusive(disable),
    run: () => exclusive(async () => {
      const config = await loadAutoBackup(settings);
      if (!config || now() - config.lastRun < backupInterval(config.frequency) * 60_000) return;
      try {
        const passphrase = await secret.get();
        if (!passphrase) throw new Error('Auto-backup passphrase unavailable');
        await save(config, passphrase);
      } catch (error) {
        await settings.set('autoBackupError', '1');
        throw error;
      }
    }),
  };
}

export async function backupIsStale(settings: Settings, store: Pick<CardStore, 'lastChangeAt'>, notes: Pick<NoteStore, 'lastChangeAt'>, now = Date.now()): Promise<boolean> {
  const [last, documentsChanged, notesChanged] = await Promise.all([
    settings.getNumber('lastExportAt'), store.lastChangeAt(), notes.lastChangeAt(),
  ]);
  const changed = Math.max(documentsChanged ?? 0, notesChanged ?? 0);
  return changed > (last ?? 0) && (last === null || now - last > 30 * 86_400_000);
}

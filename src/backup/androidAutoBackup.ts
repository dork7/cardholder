import { Platform } from 'react-native';
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system/legacy';
import { Services, boot } from '../app/boot';
import { secureVault } from '../crypto/secureVault';
import { base64 } from '../crypto/bytes';
import { createFileBlobStore } from '../storage/fileBlobStore';
import { openDatabase } from '../storage/openDatabase';
import * as Notifications from 'expo-notifications';
import { strings } from '../strings';
import { backupInterval, createAutoBackup, loadAutoBackup } from './autoBackup';
import { connect } from './drive/driveConnect';
import { createDriveBackup, DriveProblem, loadDriveBackup } from './drive/driveBackup';
import { googleAuth } from './drive/googleAuth';

const TASK = 'doc-keeper-auto-backup';
const SECRET = 'cardholder.autoBackup.passphrase.v1';
const DRIVE_SECRET = 'cardholder.driveBackup.passphrase.v1';
export const DRIVE_BACKUP_HREF = '/drive-backup';
const OPTIONS = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };
export const canAutoBackup = Platform.OS === 'android';

async function schedule(minutes: number | null) {
  if (!canAutoBackup) return;
  if (minutes === null) {
    if (await TaskManager.isTaskRegisteredAsync(TASK)) await BackgroundTask.unregisterTaskAsync(TASK);
    return;
  }
  if (await BackgroundTask.getStatusAsync() !== BackgroundTask.BackgroundTaskStatus.Available) {
    throw new Error('Background backup unavailable');
  }
  await BackgroundTask.registerTaskAsync(TASK, { minimumInterval: minutes });
}

// One background task serves both the folder and the Drive backup: it runs as often as the more
// frequent of the two needs, and is removed when both are off.
async function reschedule(services: Pick<Services, 'settings'>) {
  const [folder, drive] = await Promise.all([
    loadAutoBackup(services.settings).catch(() => null),
    loadDriveBackup(services.settings).catch(() => null),
  ]);
  const intervals = [folder, drive].flatMap((config) => config ? [backupInterval(config.frequency)] : []);
  await schedule(intervals.length ? Math.min(...intervals) : null);
}

export async function pickBackupFolder(): Promise<string | null> {
  // SAF takes persistable read/write permission, so the worker can use it after process death.
  const result = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
  return result.granted ? result.directoryUri : null;
}

export function androidAutoBackup(services: Services) {
  return createAutoBackup({
    ...services,
    schedule: () => reschedule(services),
    secret: {
      get: () => SecureStore.getItemAsync(SECRET, OPTIONS),
      set: (value) => value === null ? SecureStore.deleteItemAsync(SECRET, OPTIONS) : SecureStore.setItemAsync(SECRET, value, OPTIONS),
    },
    destination: {
      async write(folder, name, bytes) {
        const uri = await FileSystem.StorageAccessFramework.createFileAsync(folder, name, 'application/octet-stream');
        try {
          await FileSystem.writeAsStringAsync(uri, base64.encode(bytes), { encoding: FileSystem.EncodingType.Base64 });
          return uri;
        } catch (error) {
          await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
          throw error;
        }
      },
      remove: (uri) => FileSystem.deleteAsync(uri, { idempotent: true }),
    },
  });
}

const secretStore = (key: string) => ({
  get: () => SecureStore.getItemAsync(key, OPTIONS),
  set: (value: string | null) => value === null ? SecureStore.deleteItemAsync(key, OPTIONS) : SecureStore.setItemAsync(key, value, OPTIONS),
});

async function notifyDriveOverdue(problem: DriveProblem | 'waiting-for-wifi') {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: strings.driveBackup.overdueTitle,
      body: strings.driveBackup.overdueBody[problem],
      data: { href: DRIVE_BACKUP_HREF },
    },
    trigger: Platform.OS === 'android' ? { channelId: 'reminders' } : null,
  });
}

export const canDriveBackup = () => canAutoBackup && googleAuth.isAvailable();

export function androidDriveBackup(services: Services) {
  return createDriveBackup({
    ...services,
    auth: googleAuth,
    connect,
    secret: secretStore(DRIVE_SECRET),
    schedule: () => reschedule(services),
    notifyOverdue: notifyDriveOverdue,
  });
}

// Import from the root layout: tasks must be defined before React mounts, including headless runs.
if (canAutoBackup) TaskManager.defineTask(TASK, async () => {
  try {
    // Never initialize a replacement data key in the background. A lost key needs foreground recovery.
    if (!(await secureVault.get())) return BackgroundTask.BackgroundTaskResult.Failed;
    const result = await boot({ db: await openDatabase(), blobs: createFileBlobStore(), vault: secureVault });
    if (result.status !== 'ready') return BackgroundTask.BackgroundTaskResult.Failed;
    const folder = await androidAutoBackup(result.services).run().then(() => true, () => false);
    // Drive failures are recorded on its settings and warned about when overdue; they don't throw.
    const drive = await androidDriveBackup(result.services).run().then((r) => r !== 'failed', () => false);
    return folder && drive ? BackgroundTask.BackgroundTaskResult.Success : BackgroundTask.BackgroundTaskResult.Failed;
  } catch {
    // No paths, passphrases or document details in background logs.
    console.warn('Scheduled backup failed');
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

// Repair a missed registration on launch, or unregister after Start fresh cleared settings.
export async function syncAutoBackup(services: Services): Promise<void> {
  if (!canAutoBackup) return;
  const config = await loadAutoBackup(services.settings);
  const drive = await loadDriveBackup(services.settings).catch(() => null);
  if (!config) await androidAutoBackup(services).disable();
  if (!config && !drive) return;
  if (!(await TaskManager.isTaskRegisteredAsync(TASK))) await reschedule(services);
  await services.noteEditors.flushAll();
  // Drive first: a failed folder backup throws, and shouldn't hold up the Drive one.
  if (drive) await androidDriveBackup(services).run();
  if (config) await androidAutoBackup(services).run();
}

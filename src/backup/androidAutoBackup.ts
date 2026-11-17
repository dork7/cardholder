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
import { backupInterval, createAutoBackup, loadAutoBackup } from './autoBackup';

const TASK = 'doc-keeper-auto-backup';
const SECRET = 'cardholder.autoBackup.passphrase.v1';
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

export async function pickBackupFolder(): Promise<string | null> {
  // SAF takes persistable read/write permission, so the worker can use it after process death.
  const result = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
  return result.granted ? result.directoryUri : null;
}

export function androidAutoBackup(services: Services) {
  return createAutoBackup({
    ...services,
    schedule,
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

// Import from the root layout: tasks must be defined before React mounts, including headless runs.
if (canAutoBackup) TaskManager.defineTask(TASK, async () => {
  try {
    // Never initialize a replacement data key in the background. A lost key needs foreground recovery.
    if (!(await secureVault.get())) return BackgroundTask.BackgroundTaskResult.Failed;
    const result = await boot({ db: await openDatabase(), blobs: createFileBlobStore(), vault: secureVault });
    if (result.status !== 'ready') return BackgroundTask.BackgroundTaskResult.Failed;
    await androidAutoBackup(result.services).run();
    return BackgroundTask.BackgroundTaskResult.Success;
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
  if (!config) {
    await androidAutoBackup(services).disable();
    return;
  }
  if (!(await TaskManager.isTaskRegisteredAsync(TASK))) await schedule(backupInterval(config.frequency));
  await services.noteEditors.flushAll();
  await androidAutoBackup(services).run();
}

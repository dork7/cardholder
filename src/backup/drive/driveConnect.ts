import * as FileSystem from 'expo-file-system/legacy';
import { base64 } from '../../crypto/bytes';
import { createDriveClient, DriveError } from './driveApi';
import { createDriveRestore } from './driveBackup';
import { googleAuth } from './googleAuth';

// Downloads through the file system: a backup can be hundreds of MB.
async function downloadBytes(url: string, headers: Record<string, string>): Promise<Uint8Array> {
  const target = `${FileSystem.cacheDirectory}drive-restore.cardholder`;
  try {
    const result = await FileSystem.downloadAsync(url, target, { headers });
    if (result.status === 401) throw new DriveError('auth');
    if (result.status !== 200) throw new DriveError(result.status === 404 ? 'not-found' : 'network');
    return base64.decode(await FileSystem.readAsStringAsync(target, { encoding: FileSystem.EncodingType.Base64 }));
  } finally {
    await FileSystem.deleteAsync(target, { idempotent: true }).catch(() => {});
  }
}

// The real Drive client: fetch for requests, the file system for downloads.
export const connect = (token: (fresh: boolean) => Promise<string>) =>
  createDriveClient({ fetch: (url, init) => fetch(url, init), download: downloadBytes, token });

export const canRestoreFromDrive = () => googleAuth.isAvailable();
export const driveRestore = () => createDriveRestore({ auth: googleAuth, connect });

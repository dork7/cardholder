import { requireOptionalNativeModule } from 'expo';
import { Directory, File, Paths } from 'expo-file-system';
import { MANIFEST_URL, parseManifest, UpdateManifest } from './manifest';

interface AppUpdateNative {
  installedVersionCode(): number;
  canInstall(): boolean;
  openInstallPermission(): void;
  install(fileUri: string): void;
}

// Android only (modules/app-update). On iOS, and in builds made before it was added, the app
// doesn't offer updates at all.
const native = requireOptionalNativeModule<AppUpdateNative>('AppUpdate');
export const canSelfUpdate = Boolean(native);

export class UpdateNetworkError extends Error {}
export class BadReleaseError extends Error {}
export class UpdateCheckError extends Error {}

export const installedVersionCode = (): number => native?.installedVersionCode() ?? 0;

// The latest release's version.json. Only this file and the APK are fetched; nothing is sent.
export async function fetchManifest(signal?: AbortSignal): Promise<UpdateManifest> {
  let body: unknown;
  try {
    const response = await fetch(MANIFEST_URL, { signal, headers: { 'Cache-Control': 'no-cache' } });
    if (!response.ok) throw new UpdateNetworkError(`HTTP ${response.status}`);
    body = await response.json();
  } catch (e) {
    if (e instanceof UpdateNetworkError || signal?.aborted) throw e;
    throw new UpdateNetworkError(String(e));
  }
  const manifest = parseManifest(body);
  if (!manifest) throw new BadReleaseError('The release has no usable version.json');
  return manifest;
}

const updatesDir = () => new Directory(Paths.cache, 'updates');

// Deletes any downloaded APK. Run before a new download and when the app starts, so an installed or
// abandoned update doesn't keep ~150 MB of cache.
export function clearDownloads(): void {
  try {
    const dir = updatesDir();
    if (dir.exists) dir.delete();
  } catch (e) {
    console.warn('Clearing old updates failed', e);
  }
}

// Downloads the APK into the cache and checks it against the release's SHA-256. Returns its file URI.
export async function downloadApk(
  manifest: UpdateManifest,
  onProgress?: (fraction: number | null) => void,
  signal?: AbortSignal,
): Promise<string> {
  clearDownloads();
  updatesDir().create({ intermediates: true, idempotent: true });
  const file = new File(updatesDir(), `DocKeeper-${manifest.versionName.replace(/[^0-9A-Za-z.-]/g, '')}.apk`);
  try {
    await File.downloadFileAsync(manifest.apkUrl, file, {
      idempotent: true,
      signal,
      onProgress: ({ bytesWritten, totalBytes }) => onProgress?.(totalBytes > 0 ? bytesWritten / totalBytes : null),
    });
  } catch (e) {
    clearDownloads();
    if (signal?.aborted) throw e;
    throw new UpdateNetworkError(String(e));
  }
  if ((await file.digest('SHA-256')).toLowerCase() !== manifest.sha256) {
    clearDownloads();
    throw new UpdateCheckError('The download does not match the release');
  }
  return file.uri;
}

export const canInstall = (): boolean => native?.canInstall() ?? false;
export const openInstallPermission = (): void => native?.openInstallPermission();
export const install = (fileUri: string): void => native?.install(fileUri);

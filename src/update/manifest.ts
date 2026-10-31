// What a GitHub Release says about itself, in its version.json (written by scripts/release-android.sh
// and the release workflow).

const REPO = 'dork7/cardholder';
export const MANIFEST_URL = `https://github.com/${REPO}/releases/latest/download/version.json`;
// The APK must come from this repository's own releases, whatever the manifest says.
const APK_PREFIX = `https://github.com/${REPO}/releases/download/`;

export interface UpdateManifest {
  versionCode: number;
  versionName: string;
  apkUrl: string;
  releaseNotes: string;
  sha256: string; // of the APK, lowercase hex; a download that doesn't match is never installed
  size: number | null; // bytes, when the release gives it
}

const SHA256 = /^[0-9a-f]{64}$/;

// Null when anything needed is missing or doesn't look right. Releases made before the app could
// update itself have no sha256, so they are never offered: an APK that can't be checked isn't installed.
export function parseManifest(raw: unknown): UpdateManifest | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const m = raw as Record<string, unknown>;
  const { versionCode, versionName, apkUrl, releaseNotes, sha256, size } = m;
  if (typeof versionCode !== 'number' || !Number.isInteger(versionCode) || versionCode <= 0) return null;
  if (typeof versionName !== 'string' || versionName === '') return null;
  if (typeof apkUrl !== 'string' || !apkUrl.startsWith(APK_PREFIX) || !apkUrl.endsWith('.apk')) return null;
  if (typeof sha256 !== 'string' || !SHA256.test(sha256.toLowerCase())) return null;
  return {
    versionCode,
    versionName,
    apkUrl,
    releaseNotes: typeof releaseNotes === 'string' ? releaseNotes.trim() : '',
    sha256: sha256.toLowerCase(),
    size: typeof size === 'number' && size > 0 ? size : null,
  };
}

export const isNewer = (manifest: UpdateManifest, installedVersionCode: number) =>
  manifest.versionCode > installedVersionCode;

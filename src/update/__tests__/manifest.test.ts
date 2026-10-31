import { isNewer, MANIFEST_URL, parseManifest } from '../manifest';

const sha = 'ab'.repeat(32);
const good = {
  versionCode: 1000007,
  versionName: '1.0.7',
  apkUrl: 'https://github.com/dork7/cardholder/releases/download/v1.0.7/DocKeeper-1.0.7.apk',
  releaseNotes: '- feat: something\n',
  sha256: sha,
  size: 154_000_000,
};

test('checks the latest release of this repository', () => {
  expect(MANIFEST_URL).toBe('https://github.com/dork7/cardholder/releases/latest/download/version.json');
});

test('reads a release made by the release script', () => {
  expect(parseManifest(good)).toEqual({ ...good, releaseNotes: '- feat: something' });
});

test('releases without a SHA-256 are never offered: the download could not be checked', () => {
  const { sha256: _, ...v106 } = good;
  expect(parseManifest(v106)).toBeNull();
  expect(parseManifest({ ...good, sha256: 'not-hex' })).toBeNull();
});

test('only an APK from this repository’s releases is accepted', () => {
  expect(parseManifest({ ...good, apkUrl: 'https://example.com/DocKeeper-1.0.7.apk' })).toBeNull();
  expect(parseManifest({ ...good, apkUrl: 'https://github.com/someone/else/releases/download/v1/x.apk' })).toBeNull();
  expect(parseManifest({ ...good, apkUrl: 'http://github.com/dork7/cardholder/releases/download/v1.0.7/DocKeeper-1.0.7.apk' })).toBeNull();
  expect(parseManifest({ ...good, apkUrl: `${good.apkUrl}.zip` })).toBeNull();
});

test('anything malformed is refused', () => {
  expect(parseManifest(null)).toBeNull();
  expect(parseManifest('1.0.7')).toBeNull();
  expect(parseManifest({ ...good, versionCode: '1000007' })).toBeNull();
  expect(parseManifest({ ...good, versionCode: 1.5 })).toBeNull();
  expect(parseManifest({ ...good, versionName: '' })).toBeNull();
});

test('notes and size are optional', () => {
  const { releaseNotes: _, size: __, ...bare } = good;
  expect(parseManifest(bare)).toMatchObject({ releaseNotes: '', size: null });
});

test('newer means a higher versionCode', () => {
  const m = parseManifest(good)!;
  expect(isNewer(m, 1000006)).toBe(true);
  expect(isNewer(m, 1000007)).toBe(false);
  expect(isNewer(m, 1001000)).toBe(false);
});

import { Directory, File, Paths } from 'expo-file-system';
import { SharedFile } from './sharedIn';

// Our own copies of shared files, under names we chose. The share library hands over either a copy
// it made in the cache folder or, for some apps, the path of the user's own file; only the first may
// ever be deleted, and file names from other apps can hold characters a file URI can't.
const sharedDir = () => new Directory(Paths.cache, 'shared');

const fileUri = (path: string) =>
  path.startsWith('file://') ? path : `file://${path.split('/').map(encodeURIComponent).join('/')}`;

const extension = (f: SharedFile) => (f.mimeType === 'application/pdf' ? 'pdf' : (/\.([a-z0-9]{1,5})$/i.exec(f.fileName ?? f.path)?.[1] ?? 'jpg'));

function deleteIfInCache(file: File): void {
  try {
    if (file.uri.startsWith(Paths.cache.uri) && file.exists) file.delete();
  } catch {
    // ignore: the OS clears the cache folder too
  }
}

// Copies each shared file into the cache folder and gives back the copies, in the order shared.
export async function copyShared(files: readonly SharedFile[]): Promise<SharedFile[]> {
  const dir = sharedDir();
  dir.create({ intermediates: true, idempotent: true });
  const stamp = Date.now();
  const copies: SharedFile[] = [];
  try {
    for (const [i, f] of files.entries()) {
      const from = new File(fileUri(f.path));
      const to = new File(dir, `${stamp}-${i}.${extension(f)}`);
      await from.copy(to);
      copies.push({ ...f, path: to.uri });
    }
    return copies;
  } catch (e) {
    discardShared(copies.map((c) => c.path));
    throw e;
  } finally {
    for (const f of files) deleteIfInCache(new File(fileUri(f.path)));
  }
}

// Plaintext documents: each copy goes as soon as it has been used.
export function discardShared(paths: readonly string[]): void {
  for (const path of paths) deleteIfInCache(new File(fileUri(path)));
}

// Copies left by a share that never reached the form (the app was closed first).
export function clearShared(): void {
  try {
    const dir = sharedDir();
    if (dir.exists) dir.delete();
  } catch {
    // ignore
  }
}

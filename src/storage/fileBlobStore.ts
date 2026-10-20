import { Directory, File, Paths } from 'expo-file-system';
import { atomicReplace } from './atomicReplace';
import { BlobStore } from './blobStore';

export function createFileBlobStore(folder = 'cards'): BlobStore {
  const dir = new Directory(Paths.document, folder);
  const ensureDir = () => {
    if (!dir.exists) dir.create({ intermediates: true });
  };
  const file = (name: string) => new File(dir, name);
  const removeIfPresent = (name: string) => {
    const f = file(name);
    if (f.exists) f.delete();
  };
  let tempCounter = 0;

  return {
    // Write-then-move so a failed write never loses the existing blob. `File.move` with
    // `overwrite: true` is the only replace primitive expo-file-system offers; on iOS it removes the
    // destination and then renames the already-complete temp file, so the temp copy survives any
    // interruption. Leftover `*.tmp` files are listed, so `startFresh` sweeps them.
    async put(name, bytes) {
      ensureDir();
      tempCounter += 1;
      await atomicReplace(
        {
          async write(tempName, data) {
            const f = file(tempName);
            f.create({ overwrite: true });
            await f.write(data);
          },
          moveOver: (from, to) => file(from).move(file(to), { overwrite: true }),
          async remove(tempName) {
            removeIfPresent(tempName);
          },
        },
        name,
        bytes,
        `${name}.${tempCounter}.tmp`,
      );
    },
    async get(name) {
      const f = file(name);
      return f.exists ? f.bytes() : null;
    },
    async remove(name) {
      removeIfPresent(name);
    },
    async list() {
      if (!dir.exists) return [];
      return dir
        .list()
        .filter((entry): entry is File => entry instanceof File)
        .map((f) => f.name);
    },
  };
}

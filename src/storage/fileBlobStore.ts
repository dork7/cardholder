import { Directory, File, Paths } from 'expo-file-system';
import { BlobStore } from './blobStore';

export function createFileBlobStore(folder = 'cards'): BlobStore {
  const dir = new Directory(Paths.document, folder);
  const ensureDir = () => {
    if (!dir.exists) dir.create({ intermediates: true });
  };
  const file = (name: string) => new File(dir, name);

  return {
    async put(name, bytes) {
      ensureDir();
      const f = file(name);
      if (f.exists) f.delete();
      f.create();
      f.write(bytes);
    },
    async get(name) {
      const f = file(name);
      return f.exists ? f.bytes() : null;
    },
    async remove(name) {
      const f = file(name);
      if (f.exists) f.delete();
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

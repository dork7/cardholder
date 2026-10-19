import { BlobStore } from '../src/storage/blobStore';

export function createMemoryBlobStore(): BlobStore & { raw: Map<string, Uint8Array> } {
  const raw = new Map<string, Uint8Array>();
  return {
    raw,
    async put(name, bytes) {
      raw.set(name, Uint8Array.from(bytes));
    },
    async get(name) {
      return raw.get(name) ?? null;
    },
    async remove(name) {
      raw.delete(name);
    },
    async list() {
      return [...raw.keys()];
    },
  };
}

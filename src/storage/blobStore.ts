// Flat namespace of opaque byte blobs (encrypted card images).
export interface BlobStore {
  put(name: string, bytes: Uint8Array): Promise<void>;
  get(name: string): Promise<Uint8Array | null>;
  remove(name: string): Promise<void>;
  list(): Promise<string[]>;
}

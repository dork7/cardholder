import { KeyVault } from '../src/crypto/keyring';

export function createMemoryVault(initial: Uint8Array | null = null): KeyVault & { key: Uint8Array | null } {
  const vault = {
    key: initial,
    async get() {
      return vault.key;
    },
    async set(key: Uint8Array) {
      vault.key = key;
    },
  };
  return vault;
}

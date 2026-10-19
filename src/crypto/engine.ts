import QuickCrypto from 'react-native-quick-crypto';

// The subset of the Node-compatible crypto API this app relies on.
// react-native-quick-crypto implements it natively; Jest maps it to Node's crypto.
export interface Cipher {
  update(data: Uint8Array): Uint8Array;
  final(): Uint8Array;
  getAuthTag(): Uint8Array;
}

export interface Decipher {
  update(data: Uint8Array): Uint8Array;
  final(): Uint8Array;
  setAuthTag(tag: Uint8Array): void;
}

export interface CryptoEngine {
  randomBytes(size: number): Uint8Array;
  createCipheriv(algorithm: 'aes-256-gcm', key: Uint8Array, iv: Uint8Array): Cipher;
  createDecipheriv(algorithm: 'aes-256-gcm', key: Uint8Array, iv: Uint8Array): Decipher;
  pbkdf2(
    password: string,
    salt: Uint8Array,
    iterations: number,
    keylen: number,
    digest: 'sha256',
    callback: (err: Error | null, derivedKey?: Uint8Array) => void,
  ): void;
}

export const engine = QuickCrypto as unknown as CryptoEngine;

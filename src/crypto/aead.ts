import { concat } from './bytes';
import { engine } from './engine';

const VERSION = 1;
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

export class DecryptError extends Error {
  constructor() {
    super('Decryption failed');
    this.name = 'DecryptError';
  }
}

export interface Aead {
  seal(plaintext: Uint8Array): Uint8Array;
  open(sealed: Uint8Array): Uint8Array;
}

export function generateKey(): Uint8Array {
  return new Uint8Array(engine.randomBytes(KEY_LENGTH));
}

export function createAead(key: Uint8Array): Aead {
  if (key.length !== KEY_LENGTH) throw new Error(`AES-256 key must be ${KEY_LENGTH} bytes`);
  return {
    seal(plaintext) {
      const iv = engine.randomBytes(IV_LENGTH);
      const cipher = engine.createCipheriv('aes-256-gcm', key, iv);
      const body = concat(cipher.update(plaintext), cipher.final());
      return concat(Uint8Array.of(VERSION), iv, body, cipher.getAuthTag());
    },
    open(sealed) {
      if (sealed.length < 1 + IV_LENGTH + TAG_LENGTH || sealed[0] !== VERSION) throw new DecryptError();
      const iv = sealed.subarray(1, 1 + IV_LENGTH);
      const body = sealed.subarray(1 + IV_LENGTH, sealed.length - TAG_LENGTH);
      const tag = sealed.subarray(sealed.length - TAG_LENGTH);
      try {
        const decipher = engine.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(tag);
        return concat(decipher.update(body), decipher.final());
      } catch {
        throw new DecryptError();
      }
    },
  };
}

import { Buffer } from 'buffer';

export function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

export const utf8 = {
  encode: (s: string): Uint8Array => new Uint8Array(Buffer.from(s, 'utf8')),
  decode: (b: Uint8Array): string => Buffer.from(b).toString('utf8'),
};

export const base64 = {
  encode: (b: Uint8Array): string => Buffer.from(b).toString('base64'),
  decode: (s: string): Uint8Array => new Uint8Array(Buffer.from(s, 'base64')),
};

export function toHex(b: Uint8Array): string {
  return Buffer.from(b).toString('hex');
}

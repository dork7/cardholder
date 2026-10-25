import { decodeBase45, encodeBase45 } from './base45';
import { crc32 } from './crc32';
import { blockCount, createFountainDecoder, encodeBlock, FountainDecoder } from './fountain';

// One QR code of a transfer: "CH1:" then base45 of a 19-byte header and one fountain block.
//   version u8 · transfer id u32 · block count u16 · message length u32 · message CRC-32 u32 · seq u32
const PREFIX = 'CH1:';
const VERSION = 1;
const HEADER = 19;
// Sized for a QR code a phone camera reads off another phone's screen at a glance (about version 22
// with low error correction, alphanumeric).
export const BLOCK_SIZE = 700;
// A shrunk card is around 150 KB; this refuses anything absurd before memory is spent on it.
export const MAX_MESSAGE = 1_500_000;

export interface Transfer {
  id: number;
  k: number;
  frame(seq: number): string;
}

export function createTransfer(message: Uint8Array, id: number): Transfer {
  if (message.length > MAX_MESSAGE) throw new Error('Card too large to send');
  const k = blockCount(message.length, BLOCK_SIZE);
  const crc = crc32(message);
  return {
    id,
    k,
    frame(seq) {
      const bytes = new Uint8Array(HEADER + BLOCK_SIZE);
      const view = new DataView(bytes.buffer);
      view.setUint8(0, VERSION);
      view.setUint32(1, id);
      view.setUint16(5, k);
      view.setUint32(7, message.length);
      view.setUint32(11, crc);
      view.setUint32(15, seq >>> 0);
      bytes.set(encodeBlock(message, BLOCK_SIZE, seq >>> 0), HEADER);
      return PREFIX + encodeBase45(bytes);
    },
  };
}

export type ReceiveState =
  | { kind: 'waiting' } // nothing usable read yet
  | { kind: 'receiving'; progress: number } // 0–1
  | { kind: 'done'; message: Uint8Array }
  | { kind: 'damaged' }; // everything arrived but didn't check out; start again

export interface ReceiveSession {
  // Feeds one scanned QR code. Codes from other apps, or from a second transfer while one is under
  // way, are ignored.
  scan(text: string): ReceiveState;
}

export function createReceiveSession(): ReceiveSession {
  let current: { id: number; length: number; crc: number; decoder: FountainDecoder } | null = null;
  let state: ReceiveState = { kind: 'waiting' };

  return {
    scan(text) {
      if (state.kind === 'done' || state.kind === 'damaged') return state;
      if (!text.startsWith(PREFIX)) return state;
      const bytes = decodeBase45(text.slice(PREFIX.length));
      if (!bytes || bytes.length !== HEADER + BLOCK_SIZE) return state;
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      if (view.getUint8(0) !== VERSION) return state;
      const id = view.getUint32(1);
      const k = view.getUint16(5);
      const length = view.getUint32(7);
      const crc = view.getUint32(11);
      const seq = view.getUint32(15);
      if (length === 0 || length > MAX_MESSAGE || k !== blockCount(length, BLOCK_SIZE)) return state;

      if (!current) current = { id, length, crc, decoder: createFountainDecoder(k, BLOCK_SIZE) };
      if (id !== current.id) return state;

      const known = current.decoder.add(seq, bytes.subarray(HEADER));
      const message = current.decoder.result(current.length);
      if (!message) state = { kind: 'receiving', progress: known / k };
      else state = crc32(message) === current.crc ? { kind: 'done', message } : { kind: 'damaged' };
      return state;
    },
  };
}

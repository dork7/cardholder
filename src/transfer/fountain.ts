// A random linear fountain code over GF(2). The message is cut into k blocks; every frame carries
// one block or the XOR of a random half of them, and which ones follows from the frame's sequence
// number alone. The receiver can start at any point and miss any frames: any k frames that are
// independent (k + 2 or so in practice) rebuild the message. A plain repeating sequence would make it
// wait a whole round for each frame it missed.
//
// The stream alternates a plain pass over the blocks (each caught one is a block outright) with an
// equal run of mixed frames that fill whatever was missed. At this size (a few hundred blocks)
// Gaussian elimination is cheap, and it wastes far fewer frames than an LT code would.

// Seeded generator (mulberry32): sender and receiver derive the same choices from the seq.
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  };
}

const words = (k: number) => Math.ceil(k / 32);

// Which blocks frame `seq` combines, as a bit set over the k blocks. Never empty.
export function blocksFor(seq: number, k: number): Uint32Array {
  const bits = new Uint32Array(words(k));
  const r = seq % (2 * k);
  if (r < k) {
    bits[r >>> 5] = 1 << (r & 31);
    return bits;
  }
  const next = rng(Math.imul(seq, 0x9e3779b1) ^ k);
  for (let w = 0; w < bits.length; w++) bits[w] = next();
  if (k % 32) bits[bits.length - 1] &= (1 << (k % 32)) - 1;
  if (bits.every((w) => w === 0)) bits[0] = 1;
  return bits;
}

export function blockCount(length: number, blockSize: number): number {
  return Math.max(1, Math.ceil(length / blockSize));
}

export function encodeBlock(message: Uint8Array, blockSize: number, seq: number): Uint8Array {
  const k = blockCount(message.length, blockSize);
  const bits = blocksFor(seq, k);
  const out = new Uint8Array(blockSize);
  for (let b = 0; b < k; b++) {
    if (!(bits[b >>> 5] & (1 << (b & 31)))) continue;
    const start = b * blockSize;
    const part = message.subarray(start, Math.min(start + blockSize, message.length));
    for (let i = 0; i < part.length; i++) out[i] ^= part[i];
  }
  return out;
}

export interface FountainDecoder {
  // Adds one received frame. Returns how many independent frames are held (k means done).
  add(seq: number, data: Uint8Array): number;
  readonly k: number;
  // The message, once it can be solved; trailing padding is cut to `length`.
  result(length: number): Uint8Array | null;
}

const lowestBit = (bits: Uint32Array): number => {
  for (let w = 0; w < bits.length; w++) {
    if (bits[w]) return w * 32 + (31 - Math.clz32(bits[w] & -bits[w]));
  }
  return -1;
};

// Incremental Gaussian elimination: each frame is reduced against the rows held so far, keyed by
// their lowest block; one that reduces to nothing told us nothing new.
export function createFountainDecoder(k: number, blockSize: number): FountainDecoder {
  const rows: ({ bits: Uint32Array; data: Uint8Array } | undefined)[] = new Array(k);
  let rank = 0;
  const seen = new Set<number>();

  const xor = (a: Uint32Array | Uint8Array, b: Uint32Array | Uint8Array) => {
    for (let i = 0; i < a.length; i++) a[i] ^= b[i];
  };

  return {
    k,
    add(seq, data) {
      if (rank === k || seen.has(seq) || data.length !== blockSize) return rank;
      seen.add(seq);
      const bits = blocksFor(seq, k);
      const own = data.slice();
      for (let pivot = lowestBit(bits); pivot >= 0; pivot = lowestBit(bits)) {
        const row = rows[pivot];
        if (!row) {
          rows[pivot] = { bits, data: own };
          rank++;
          break;
        }
        xor(bits, row.bits);
        xor(own, row.data);
      }
      return rank;
    },
    result(length) {
      if (rank < k) return null;
      // Back-substitution, from the last block up: clear every bit above each row's own.
      for (let p = k - 1; p >= 0; p--) {
        const row = rows[p]!;
        for (let q = p + 1; q < k; q++) {
          if (row.bits[q >>> 5] & (1 << (q & 31))) {
            xor(row.bits, rows[q]!.bits);
            xor(row.data, rows[q]!.data);
          }
        }
      }
      const out = new Uint8Array(k * blockSize);
      rows.forEach((row, i) => out.set(row!.data, i * blockSize));
      return out.subarray(0, length);
    },
  };
}

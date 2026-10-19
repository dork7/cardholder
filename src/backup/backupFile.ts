import { ImportEntry } from '../cards/cardStore';
import { Card, CardImage } from '../cards/types';
import { validateCardFields } from '../cards/validate';
import { PBKDF2_ITERATIONS } from '../config';
import { createAead } from '../crypto/aead';
import { concat, utf8 } from '../crypto/bytes';
import { engine } from '../crypto/engine';

export type BackupCard = ImportEntry;

export interface BackupSnapshot {
  formatVersion: 1;
  exportedAt: number;
  cards: BackupCard[];
}

export type BackupErrorCode = 'not-a-backup' | 'unsupported-version' | 'wrong-passphrase-or-damaged' | 'invalid-contents';

export class BackupError extends Error {
  constructor(public readonly code: BackupErrorCode) {
    super(code);
    this.name = 'BackupError';
  }
}

const MAGIC = utf8.encode('CHBK');
const FORMAT_VERSION = 1;
const SALT_LENGTH = 16;
const HEADER_LENGTH = MAGIC.length + 1 + 4 + SALT_LENGTH;
const MIN_ITERATIONS = 1_000;
const MAX_ITERATIONS = 10_000_000;

function deriveKey(passphrase: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    engine.pbkdf2(passphrase.normalize('NFC'), salt, iterations, 32, 'sha256', (err, key) => {
      if (err || !key) reject(err ?? new Error('PBKDF2 failed'));
      else resolve(new Uint8Array(key));
    });
  });
}

export async function encodeBackup(
  snapshot: BackupSnapshot,
  passphrase: string,
  { iterations = PBKDF2_ITERATIONS }: { iterations?: number } = {},
): Promise<Uint8Array> {
  const salt = new Uint8Array(engine.randomBytes(SALT_LENGTH));
  const key = await deriveKey(passphrase, salt, iterations);
  const header = new Uint8Array(HEADER_LENGTH);
  header.set(MAGIC, 0);
  header[4] = FORMAT_VERSION;
  new DataView(header.buffer).setUint32(5, iterations);
  header.set(salt, 9);
  return concat(header, createAead(key).seal(utf8.encode(JSON.stringify(snapshot))));
}

export async function decodeBackup(bytes: Uint8Array, passphrase: string): Promise<BackupSnapshot> {
  if (bytes.length < HEADER_LENGTH || !MAGIC.every((b, i) => bytes[i] === b)) throw new BackupError('not-a-backup');
  if (bytes[4] !== FORMAT_VERSION) throw new BackupError('unsupported-version');
  const iterations = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(5);
  if (iterations < MIN_ITERATIONS || iterations > MAX_ITERATIONS) throw new BackupError('not-a-backup');

  const key = await deriveKey(passphrase, bytes.subarray(9, HEADER_LENGTH), iterations);
  let json: string;
  try {
    json = utf8.decode(createAead(key).open(bytes.subarray(HEADER_LENGTH)));
  } catch {
    throw new BackupError('wrong-passphrase-or-damaged');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new BackupError('invalid-contents');
  }
  return parseSnapshot(parsed);
}

// --- Validation of untrusted contents ---------------------------------------------------------

// Card ids become blob file names, so only allow characters that can't form a path.
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

function invalid(): never {
  throw new BackupError('invalid-contents');
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isPositive = (v: unknown): v is number => isNumber(v) && v > 0;
const isBase64 = (v: unknown): v is string => typeof v === 'string' && BASE64_PATTERN.test(v);

function parseImage(v: unknown): CardImage {
  if (!isObject(v) || !isBase64(v.jpegBase64) || !isPositive(v.aspect)) invalid();
  return { jpegBase64: v.jpegBase64, aspect: v.aspect };
}

function parseEntry(entry: unknown, seen: Set<string>): BackupCard {
  if (!isObject(entry) || !isObject(entry.card) || !isObject(entry.images)) invalid();
  const c = entry.card;
  const imgs = entry.images;

  if (typeof c.id !== 'string' || !ID_PATTERN.test(c.id) || seen.has(c.id)) invalid();
  seen.add(c.id);

  const fields = validateCardFields(c);
  if (!fields.ok) invalid();
  if (typeof c.pinned !== 'boolean' || !isNumber(c.position) || !isNumber(c.createdAt) || !isNumber(c.updatedAt)) invalid();
  if (!isPositive(c.frontAspect)) invalid();

  const front = parseImage(imgs.front);
  const thumb = isObject(imgs.front) ? imgs.front.thumbJpegBase64 : undefined;
  if (!isBase64(thumb)) invalid();
  const back = imgs.back === null ? null : parseImage(imgs.back);
  if (c.hasBack !== (back !== null)) invalid();
  if (back ? !isPositive(c.backAspect) : c.backAspect !== null) invalid();

  const card: Card = {
    ...fields.value,
    id: c.id,
    pinned: c.pinned,
    position: c.position,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    hasBack: back !== null,
    frontAspect: c.frontAspect,
    backAspect: back ? (c.backAspect as number) : null,
  };
  return { card, images: { front: { ...front, thumbJpegBase64: thumb }, back } };
}

export function parseSnapshot(value: unknown): BackupSnapshot {
  if (!isObject(value) || value.formatVersion !== 1 || !isNumber(value.exportedAt) || !Array.isArray(value.cards)) {
    invalid();
  }
  const seen = new Set<string>();
  return { formatVersion: 1, exportedAt: value.exportedAt, cards: value.cards.map((entry) => parseEntry(entry, seen)) };
}

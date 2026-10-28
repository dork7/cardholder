import { ImportEntry } from '../cards/cardStore';
import { Card, CardImage, Folder, PdfDocument } from '../cards/types';
import { validateCardFields } from '../cards/validate';
import { FOLDER_NAME_MAX_LENGTH, PBKDF2_ITERATIONS } from '../config';
import { createAead } from '../crypto/aead';
import { concat, utf8 } from '../crypto/bytes';
import { engine } from '../crypto/engine';

export type BackupCard = ImportEntry;

export interface BackupSnapshot {
  formatVersion: 1;
  exportedAt: number;
  cards: BackupCard[];
  folders: Folder[]; // absent from backups made before folders; read as none
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

const isPdf = (b64: string) => b64.startsWith('JVBERi0'); // base64 of "%PDF-"

// Absent from backups made before PDF cards; read as none.
function parsePdf(v: unknown): PdfDocument | null {
  if (v === undefined || v === null) return null;
  if (!isObject(v) || !isBase64(v.pdfBase64) || !isPdf(v.pdfBase64)) invalid();
  const { pageCount, coverPage } = v;
  if (!Number.isInteger(pageCount) || (pageCount as number) < 1) invalid();
  if (!Number.isInteger(coverPage) || (coverPage as number) < 0 || (coverPage as number) >= (pageCount as number)) invalid();
  return { pdfBase64: v.pdfBase64, pageCount: pageCount as number, coverPage: coverPage as number };
}

function parseFolder(v: unknown, seen: Set<string>): Folder {
  if (!isObject(v) || typeof v.id !== 'string' || !ID_PATTERN.test(v.id) || !isNumber(v.createdAt)) invalid();
  if (typeof v.name !== 'string') invalid();
  const name = v.name.trim();
  if (name === '' || [...name].length > FOLDER_NAME_MAX_LENGTH) invalid();
  const idFold = v.id.toLowerCase();
  if (seen.has(idFold)) invalid();
  seen.add(idFold);
  return { id: v.id, name, createdAt: v.createdAt };
}

function parseEntry(entry: unknown, seen: Set<string>): BackupCard {
  if (!isObject(entry) || !isObject(entry.card) || !isObject(entry.images)) invalid();
  const c = entry.card;
  const imgs = entry.images;

  if (typeof c.id !== 'string' || !ID_PATTERN.test(c.id)) invalid();
  const idFold = c.id.toLowerCase();
  if (seen.has(idFold)) invalid();
  seen.add(idFold);

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
  const pdf = parsePdf(imgs.pdf);

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
    pdf: pdf ? { pageCount: pdf.pageCount, coverPage: pdf.coverPage } : null,
  };
  return { card, images: { front: { ...front, thumbJpegBase64: thumb }, back, ...(pdf && { pdf }) } };
}

export function parseSnapshot(value: unknown): BackupSnapshot {
  if (!isObject(value) || value.formatVersion !== 1 || !isNumber(value.exportedAt) || !Array.isArray(value.cards)) {
    invalid();
  }
  if (value.folders !== undefined && !Array.isArray(value.folders)) invalid();
  const seenFolders = new Set<string>();
  const folders = (value.folders ?? []).map((f) => parseFolder(f, seenFolders));
  const folderIds = new Set(folders.map((f) => f.id));
  const seen = new Set<string>();
  const cards = value.cards.map((entry) => {
    const parsed = parseEntry(entry, seen);
    // A card pointing at a folder the file doesn't hold is kept, outside any folder.
    if (parsed.card.folderId !== null && !folderIds.has(parsed.card.folderId)) parsed.card.folderId = null;
    return parsed;
  });
  return { formatVersion: 1, exportedAt: value.exportedAt, cards, folders };
}

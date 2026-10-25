import { CardFields, CardImage } from '../cards/types';
import { validateCardFields } from '../cards/validate';
import { base64, concat, utf8 } from '../crypto/bytes';

// What travels between phones: the card's details and photos, without anything that only makes
// sense on the sending phone (its id, pin, folder, dates).
export interface CardTransferContent {
  fields: Omit<CardFields, 'folderId'>;
  front: CardImage;
  back: CardImage | null;
}

// "CHCD" · version u8 · details length u32 · details (JSON) · front JPEG · back JPEG
const MAGIC = utf8.encode('CHCD');
const VERSION = 1;

interface Details {
  name: string;
  category: string;
  expiresOn: string | null;
  tags: string[];
  documentKey: string | null;
  frontAspect: number;
  frontLength: number;
  backAspect: number | null;
  backLength: number;
}

export class TransferError extends Error {
  constructor() {
    super('Not a CardHolder card');
    this.name = 'TransferError';
  }
}

export function encodeCardMessage({ fields, front, back }: CardTransferContent): Uint8Array {
  const frontBytes = base64.decode(front.jpegBase64);
  const backBytes = back ? base64.decode(back.jpegBase64) : new Uint8Array(0);
  const details: Details = {
    name: fields.name,
    category: fields.category,
    expiresOn: fields.expiresOn,
    tags: fields.tags,
    documentKey: fields.documentKey,
    frontAspect: front.aspect,
    frontLength: frontBytes.length,
    backAspect: back?.aspect ?? null,
    backLength: backBytes.length,
  };
  const json = utf8.encode(JSON.stringify(details));
  const head = new Uint8Array(MAGIC.length + 5);
  head.set(MAGIC);
  head[4] = VERSION;
  new DataView(head.buffer).setUint32(5, json.length);
  return concat(head, json, frontBytes, backBytes);
}

const isJpeg = (b: Uint8Array) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
const isAspect = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0.2 && v < 5;
const isLength = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;

// The bytes come from another phone's screen: every part is checked as untrusted input.
export function decodeCardMessage(bytes: Uint8Array): CardTransferContent {
  const fail = (): never => {
    throw new TransferError();
  };
  if (bytes.length < MAGIC.length + 5 || !MAGIC.every((b, i) => bytes[i] === b) || bytes[4] !== VERSION) fail();
  const jsonLength = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(5);
  const start = MAGIC.length + 5;
  if (start + jsonLength > bytes.length) fail();

  let details: Partial<Details>;
  try {
    details = JSON.parse(utf8.decode(bytes.subarray(start, start + jsonLength)));
  } catch {
    return fail();
  }
  if (typeof details !== 'object' || details === null) fail();
  const { frontLength, backLength, frontAspect, backAspect } = details;
  if (!isLength(frontLength) || !isLength(backLength) || !isAspect(frontAspect)) return fail();
  if (start + jsonLength + frontLength + backLength !== bytes.length) fail();
  if ((backLength > 0) !== isAspect(backAspect)) fail();

  const validated = validateCardFields(details);
  if (!validated.ok) return fail();
  const frontBytes = bytes.subarray(start + jsonLength, start + jsonLength + frontLength);
  const backBytes = bytes.subarray(start + jsonLength + frontLength);
  if (!isJpeg(frontBytes) || (backLength > 0 && !isJpeg(backBytes))) fail();

  const { folderId: _ignored, ...fields } = validated.value;
  return {
    fields,
    front: { jpegBase64: base64.encode(frontBytes), aspect: frontAspect },
    back: backLength > 0 ? { jpegBase64: base64.encode(backBytes), aspect: backAspect as number } : null,
  };
}

import { DEFAULT_REMIND_DAYS, MAX_REMIND_DAYS, MAX_TAGS, NAME_MAX_LENGTH, READ_TEXT_MAX_LENGTH, TAG_MAX_LENGTH } from '../config';
import { isValidIsoDate } from '../time/dates';
import { normalizeTags, withLegacyCategory } from './tags';
import { CardFields, CardText } from './types';

export type FieldError = 'name-too-long' | 'bad-expiry' | 'bad-reminder' | 'bad-tags';

// Unknown-typed so the same check guards both the edit form and untrusted backup files.
export interface RawCardFields {
  name?: unknown;
  category?: unknown; // only in backups from before categories became tags; see withLegacyCategory
  expiresOn?: unknown;
  remindDaysBefore?: unknown; // a number, or the digits typed in the edit form
  tags?: unknown;
  documentKey?: unknown;
  folderId?: unknown;
  readText?: unknown;
  vertical?: unknown;
  blurPreview?: unknown;
}

export type CardValidation = { ok: true; value: CardFields } | { ok: false; errors: FieldError[] };

// Folder ids are random hex from this app; anything else (or none, in an older backup) means no folder.
const FOLDER_ID = /^[A-Za-z0-9_-]{1,64}$/;
const toFolderId = (v: unknown): string | null => (typeof v === 'string' && FOLDER_ID.test(v) ? v : null);

function optionalText(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const trimmed = v.trim();
  return trimmed === '' ? null : trimmed;
}

// Missing means none: cards and backups from before tags have no `tags` at all.
function parseTags(v: unknown): string[] | null {
  if (v === undefined) return [];
  if (!Array.isArray(v) || !v.every((t) => typeof t === 'string')) return null;
  const tags = normalizeTags(v);
  if (tags.length > MAX_TAGS || tags.some((t) => [...t].length > TAG_MAX_LENGTH)) return null;
  return tags;
}

// Missing means the default: cards and backups from before the setting have none.
export function parseRemindDays(v: unknown): number | null {
  if (v === undefined) return DEFAULT_REMIND_DAYS;
  const n = typeof v === 'number' ? v : typeof v === 'string' && /^\s*\d+\s*$/.test(v) ? Number(v) : NaN;
  return Number.isInteger(n) && n >= 1 && n <= MAX_REMIND_DAYS ? n : null;
}

const DOCUMENT_KEY = /^[0-9a-f]{64}$/;

// Not typed by anyone either: anything malformed means "not read yet", and the card is read again.
export function toCardText(v: unknown): CardText | null {
  if (typeof v !== 'object' || v === null) return null;
  const { front, back } = v as Record<string, unknown>;
  if (typeof front !== 'string' || typeof back !== 'string') return null;
  return { front: front.slice(0, READ_TEXT_MAX_LENGTH), back: back.slice(0, READ_TEXT_MAX_LENGTH) };
}

export function validateCardFields(raw: RawCardFields): CardValidation {
  const errors: FieldError[] = [];

  // The name is optional: an unnamed card is shown by its first tag (see displayName).
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if ([...name].length > NAME_MAX_LENGTH) errors.push('name-too-long');

  const expiresOn = optionalText(raw.expiresOn);
  if (expiresOn !== null && !isValidIsoDate(expiresOn)) errors.push('bad-expiry');

  const remindDaysBefore = parseRemindDays(raw.remindDaysBefore);
  if (remindDaysBefore === null) errors.push('bad-reminder');

  const tags = parseTags(raw.tags);
  if (!tags) errors.push('bad-tags');

  if (errors.length > 0 || !tags || remindDaysBefore === null) return { ok: false, errors };
  // Never typed by anyone, so a malformed one (from an edited backup, say) is just dropped.
  const documentKey = typeof raw.documentKey === 'string' && DOCUMENT_KEY.test(raw.documentKey) ? raw.documentKey : null;
  return {
    ok: true,
    value: { name, expiresOn, remindDaysBefore, tags: withLegacyCategory(tags, raw.category), documentKey, folderId: toFolderId(raw.folderId), readText: toCardText(raw.readText), vertical: raw.vertical === true, blurPreview: raw.blurPreview === true },
  };
}

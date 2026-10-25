import { MAX_TAGS, NAME_MAX_LENGTH, TAG_MAX_LENGTH } from '../config';
import { isValidIsoDate } from '../time/dates';
import { CardFields, toCategory } from './types';

export type FieldError = 'name-too-long' | 'bad-category' | 'bad-expiry' | 'bad-tags';

// Unknown-typed so the same check guards both the edit form and untrusted backup files.
export interface RawCardFields {
  name?: unknown;
  category?: unknown;
  expiresOn?: unknown;
  tags?: unknown;
  documentKey?: unknown;
  folderId?: unknown;
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

// Trims and collapses spaces, drops blanks and case-insensitive repeats (the first spelling wins).
export function normalizeTags(tags: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const tag = raw.trim().replace(/\s+/g, ' ');
    const key = tag.toLocaleLowerCase();
    if (tag === '' || seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out;
}

// Missing means none: cards and backups from before tags have no `tags` at all.
function parseTags(v: unknown): string[] | null {
  if (v === undefined) return [];
  if (!Array.isArray(v) || !v.every((t) => typeof t === 'string')) return null;
  const tags = normalizeTags(v);
  if (tags.length > MAX_TAGS || tags.some((t) => [...t].length > TAG_MAX_LENGTH)) return null;
  return tags;
}

const DOCUMENT_KEY = /^[0-9a-f]{64}$/;

export function validateCardFields(raw: RawCardFields): CardValidation {
  const errors: FieldError[] = [];

  // The name is optional: an unnamed card is shown by its category (see displayName).
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if ([...name].length > NAME_MAX_LENGTH) errors.push('name-too-long');

  const category = toCategory(raw.category);
  if (!category) errors.push('bad-category');

  const expiresOn = optionalText(raw.expiresOn);
  if (expiresOn !== null && !isValidIsoDate(expiresOn)) errors.push('bad-expiry');

  const tags = parseTags(raw.tags);
  if (!tags) errors.push('bad-tags');

  if (errors.length > 0 || !category || !tags) return { ok: false, errors };
  // Never typed by anyone, so a malformed one (from an edited backup, say) is just dropped.
  const documentKey = typeof raw.documentKey === 'string' && DOCUMENT_KEY.test(raw.documentKey) ? raw.documentKey : null;
  return { ok: true, value: { name, category, expiresOn, tags, documentKey, folderId: toFolderId(raw.folderId) } };
}

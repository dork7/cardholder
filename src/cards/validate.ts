import { NAME_MAX_LENGTH } from '../config';
import { isValidIsoDate } from '../time/dates';
import { CardFields, toCategory } from './types';

export type FieldError = 'name-too-long' | 'bad-category' | 'bad-expiry';

// Unknown-typed so the same check guards both the edit form and untrusted backup files.
export interface RawCardFields {
  name?: unknown;
  category?: unknown;
  expiresOn?: unknown;
}

export type CardValidation = { ok: true; value: CardFields } | { ok: false; errors: FieldError[] };

function optionalText(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const trimmed = v.trim();
  return trimmed === '' ? null : trimmed;
}

export function validateCardFields(raw: RawCardFields): CardValidation {
  const errors: FieldError[] = [];

  // The name is optional: an unnamed card is shown by its category (see displayName).
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if ([...name].length > NAME_MAX_LENGTH) errors.push('name-too-long');

  const category = toCategory(raw.category);
  if (!category) errors.push('bad-category');

  const expiresOn = optionalText(raw.expiresOn);
  if (expiresOn !== null && !isValidIsoDate(expiresOn)) errors.push('bad-expiry');

  if (errors.length > 0 || !category) return { ok: false, errors };
  return { ok: true, value: { name, category, expiresOn } };
}

import { NAME_MAX_LENGTH } from '../config';
import { isValidIsoDate } from '../time/dates';
import { CardFields, CATEGORIES } from './types';

export type FieldError = 'name-required' | 'name-too-long' | 'bad-category' | 'bad-expiry';

// Unknown-typed so the same check guards both the edit form and untrusted backup files.
export interface RawCardFields {
  name?: unknown;
  category?: unknown;
  number?: unknown;
  notes?: unknown;
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

  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (name === '') errors.push('name-required');
  else if ([...name].length > NAME_MAX_LENGTH) errors.push('name-too-long');

  const category = CATEGORIES.find((c) => c === raw.category);
  if (!category) errors.push('bad-category');

  const expiresOn = optionalText(raw.expiresOn);
  if (expiresOn !== null && !isValidIsoDate(expiresOn)) errors.push('bad-expiry');

  if (errors.length > 0 || !category) return { ok: false, errors };
  return {
    ok: true,
    value: { name, category, number: optionalText(raw.number), notes: optionalText(raw.notes), expiresOn },
  };
}

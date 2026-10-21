import { NAME_MAX_LENGTH } from '../config';
import { CATEGORIES, Category } from '../cards/types';
import { isValidIsoDate } from '../time/dates';

// Phase 5 sample (docs/superpowers/plans/2026-10-21-on-device-ai.md): a small language model turns
// OCR text into suggested card fields. Its output is untrusted: every field is checked here, and
// anything that fails is dropped rather than shown.

export interface SmartSuggestion {
  name: string | null;
  expiresOn: string | null; // YYYY-MM-DD
  category: Category | null;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Constrains decoding to this shape, so the model can't wander off into prose.
export const SUGGESTION_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string', maxLength: NAME_MAX_LENGTH },
    // Copied as printed; printedDateToIso turns it into YYYY-MM-DD. Copying is far easier for a
    // tiny model than finding and reformatting a date in one step.
    expiry: { type: 'string', maxLength: 24 },
    category: { type: 'string', enum: [...CATEGORIES] },
  },
  required: ['name', 'expiry', 'category'],
  additionalProperties: false,
} as const;

const INSTRUCTIONS = `You read the text printed on a card and fill in three fields as JSON.
- name: what the user would call the card, e.g. "Emirates ID" or "Gold's Gym". Empty if unclear.
- expiry: the expiry date copied exactly as printed on the card, e.g. "14/03/2028". Empty if the card shows no expiry date.
- category: "id" for identity documents, "insurance" for health or other insurance, "membership" for clubs, gyms and loyalty schemes, otherwise "other".`;

// A tiny model follows worked examples far better than instructions alone.
const EXAMPLES: [string, ModelAnswer][] = [
  [
    'UNITED ARAB EMIRATES\nRESIDENT IDENTITY CARD\nID Number 784-1990-1234567-1\nName: Sara Ahmed\nExpiry Date 14/03/2028',
    { name: 'Emirates ID', expiry: '14/03/2028', category: 'id' },
  ],
  [
    'FITNESS FIRST\nMEMBER\nJOHN SMITH\nMember No. 00451278',
    { name: 'Fitness First', expiry: '', category: 'membership' },
  ],
];

// What the model writes, before validation.
interface ModelAnswer {
  name: string;
  expiry: string;
  category: Category;
}

export function buildMessages(cardText: string): ChatMessage[] {
  const messages: ChatMessage[] = [{ role: 'system', content: INSTRUCTIONS }];
  for (const [text, answer] of EXAMPLES) {
    messages.push({ role: 'user', content: text }, { role: 'assistant', content: JSON.stringify(answer) });
  }
  messages.push({ role: 'user', content: cardText.trim() });
  return messages;
}

// Arabic-Indic (٠–٩) and Eastern Arabic-Indic (۰–۹) digits → 0–9.
export function normalizeDigits(s: string): string {
  return s.replace(/[٠-٩۰-۹]/g, (d) => String(d.charCodeAt(0) & 0xf));
}

// The model may only suggest what the card actually shows: every word of a name must appear in the
// text, and the expiry must be copied from it verbatim. This catches made-up values that are
// otherwise well formed.
export function parseSuggestion(raw: string, cardText: string): SmartSuggestion | null {
  // The model can wrap the object in chat-template tokens (e.g. "<start_of_turn>model"), so read
  // only the outermost {...}.
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  let value: unknown;
  try {
    value = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  const text = normalizeDigits(cardText).toLowerCase();

  const name = typeof v.name === 'string' ? v.name.trim() : '';
  const words = name.toLowerCase().split(/\s+/).filter(Boolean);
  const nameOk = words.length > 0 && [...name].length <= NAME_MAX_LENGTH && words.every((w) => text.includes(w));

  const printed = typeof v.expiry === 'string' ? normalizeDigits(v.expiry.trim()) : '';
  const expiresOn = printed !== '' && text.includes(printed.toLowerCase()) ? printedDateToIso(printed) : null;

  const category = CATEGORIES.find((c) => c === v.category) ?? null;

  return { name: nameOk ? name : null, expiresOn, category };
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const pad = (n: number) => String(n).padStart(2, '0');
const lastDay = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();
const fullYear = (y: string) => (y.length === 2 ? 2000 + Number(y) : Number(y));

// Dates as cards print them → YYYY-MM-DD. UAE cards put the day first, so 09/11/2030 is 9 November.
// A month-only date (06/2027) means valid through the end of that month.
export function printedDateToIso(printed: string): string | null {
  const s = normalizeDigits(printed).trim().toLowerCase();
  let year: number, month: number, day: number;
  let m: RegExpExecArray | null;
  if ((m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(s))) {
    [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  } else if ((m = /^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{4}|\d{2})$/.exec(s))) {
    [day, month, year] = [Number(m[1]), Number(m[2]), fullYear(m[3])];
  } else if ((m = /^(\d{1,2})[-/. ]([a-z]{3})[a-z]*[-/. ,]+(\d{4})$/.exec(s))) {
    [day, month, year] = [Number(m[1]), MONTHS.indexOf(m[2]) + 1, Number(m[3])];
  } else if ((m = /^(\d{1,2})[-/.](\d{4}|\d{2})$/.exec(s))) {
    [month, year] = [Number(m[1]), fullYear(m[2])];
    day = month >= 1 && month <= 12 ? lastDay(year, month) : 0;
  } else {
    return null;
  }
  const iso = `${year}-${pad(month)}-${pad(day)}`;
  return isValidIsoDate(iso) ? iso : null;
}

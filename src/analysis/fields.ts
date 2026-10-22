import { NAME_MAX_LENGTH } from '../config';
import { normalizeDigits, printedDateToIso } from './smartExtract';
import { Mrz } from './mrz';
import { Guess, OcrLine } from './types';

// Rules, not a model: every suggestion here can be traced to text printed on the card.
// The card's name is what the user would call it ("Emirates ID", "Daman"), not the holder's name.

// Emirates ID number: 784-YYYY-NNNNNNN-C.
export const EMIRATES_ID = /\b784[- ]?\d{4}[- ]?\d{7}[- ]?\d\b/;

const EXPIRY_LABEL = /expir|\bexp\b|\bexp\.|valid\s*(until|till|thru|through|to)|good\s*thru|تاريخ\s*الانتهاء|ينتهي/i;
const NOT_EXPIRY_LABEL = /birth|\bdob\b|issue|issued|الميلاد|الإصدار/i;
// Dates as cards print them; printedDateToIso decides whether a match is real.
const DATE = /\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/. ]\d{1,2}[-/. ](?:\d{4}|\d{2})|\d{1,2}[-/. ][A-Za-z]{3,9}[-/. ,]+\d{4}|\d{1,2}[-/.](?:\d{4}|\d{2})/g;

function datesIn(text: string): string[] {
  const found: string[] = [];
  for (const m of normalizeDigits(text).matchAll(DATE)) {
    const iso = printedDateToIso(m[0]);
    if (iso) found.push(iso);
  }
  return found;
}

const latest = (dates: string[]) => [...dates].sort().at(-1);

export function extractExpiry(lines: OcrLine[], mrz: Mrz | null, today: string): Guess<string> | undefined {
  if (mrz?.expiresOn) return { value: mrz.expiresOn, confidence: 0.95 };

  // A date on a labelled line, or on the line just below its label.
  const labelled: string[] = [];
  lines.forEach((line, i) => {
    if (!EXPIRY_LABEL.test(line.text) || NOT_EXPIRY_LABEL.test(line.text)) return;
    const here = datesIn(line.text);
    labelled.push(...(here.length > 0 ? here : datesIn(lines[i + 1]?.text ?? '')));
  });
  const fromLabel = latest(labelled);
  if (fromLabel) return { value: fromLabel, confidence: 0.85 };

  // No label: the latest date still in the future. Birth and issue dates are in the past, so this
  // usually lands on the expiry, but it is a weaker guess.
  const future = lines
    .filter((l) => !NOT_EXPIRY_LABEL.test(l.text))
    .flatMap((l) => datesIn(l.text))
    .filter((d) => d >= today);
  const guess = latest(future);
  return guess ? { value: guess, confidence: 0.6 } : undefined;
}

// Words that label a value or describe the card in general, so they are never its name.
const LABEL = /\b(name|member|holder|expiry|expires|valid|date|no\.?|number|policy|nationality|sex|gender|birth|issue|signature|card\s*no|id\s*no)\b|[:#]/i;
const GENERIC = new Set([
  'united arab emirates',
  'card',
  'member',
  'membership',
  'membership card',
  'member card',
  'insurance card',
  'health insurance card',
  'identity card',
  'resident identity card',
]);

function titleCase(s: string): string {
  if (s !== s.toUpperCase()) return s; // already mixed case: keep the brand's own casing
  return s
    .toLowerCase()
    .replace(/(^|[\s\-'’&/])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

function looksLikeTitle(text: string): boolean {
  const t = text.trim();
  if (t.length < 3 || [...t].length > NAME_MAX_LENGTH || t.includes('<')) return false;
  if (LABEL.test(t) || GENERIC.has(t.toLowerCase())) return false;
  const letters = (t.match(/\p{L}/gu) ?? []).length;
  return letters >= 3 && letters / t.replace(/\s/g, '').length >= 0.6 && datesIn(t).length === 0;
}

export function extractName(lines: OcrLine[], mrz: Mrz | null): Guess<string> | undefined {
  const text = lines.map((l) => l.text).join('\n');
  const upper = text.toUpperCase();
  if (EMIRATES_ID.test(normalizeDigits(text)) || (upper.includes('UNITED ARAB EMIRATES') && /IDENTITY\s*CARD/.test(upper))) {
    return { value: 'Emirates ID', confidence: 0.9 };
  }
  if (mrz?.format === 'td3') return { value: 'Passport', confidence: 0.85 };

  // Otherwise the most prominent line of words: the issuer's or brand's name is usually printed
  // largest, near the top.
  const candidates = lines.filter((l) => looksLikeTitle(l.text));
  if (candidates.length === 0) return undefined;
  const prominence = (l: OcrLine) => l.box.height * (l.box.y < 0.4 ? 1.5 : 1);
  const best = candidates.reduce((a, b) => (prominence(b) > prominence(a) ? b : a));
  return { value: titleCase(best.text.trim()), confidence: 0.6 };
}

import { resolveTag } from '../cards/tags';
import { strings } from '../strings';
import { EMIRATES_ID, isBirthCertificate } from './fields';
import { Mrz } from './mrz';
import { normalizeDigits } from './smartExtract';
import { CardAnalysis, Guess } from './types';

// The kind of document a card is, read from its main printed text ("Residence" → Residency), to
// suggest as the card's tag. Rules, so every suggestion traces to words on the card, in English
// or Arabic. Checked in order: a more specific title wins over a word a broader one also prints (a
// residence visa says "Passport No.", an Emirates ID says "Resident").
const TYPES: { name: string; test: (text: string, mrz: Mrz | null) => boolean }[] = [
  { name: 'Birth Certificate', test: (t) => isBirthCertificate(t) },
  { name: 'Driving License', test: (t) => /driving\s*licen[cs]e|driver'?s?\s*licen[cs]e|رخصة\s*(ال)?قيادة/i.test(t) },
  {
    name: 'Vehicle License',
    test: (t) => /vehicle\s*(licen[cs]e|registration)|mulkiya|رخصة\s*(ال)?مركبة|ملكية\s*(ال)?مركبة/i.test(t),
  },
  { name: 'Emirates ID', test: (t) => EMIRATES_ID.test(normalizeDigits(t)) || /emirates\s*id|بطاقة\s*الهوية/i.test(t) },
  { name: 'Residency', test: (t) => /\bresiden(ce|cy)\b|إقامة|اقامة/i.test(t) },
  { name: 'Work Permit', test: (t) => /work\s*permit|labou?r\s*card|تصريح\s*عمل|بطاقة\s*عمل/i.test(t) },
  // Not the bare word "Visa": bank and loyalty cards print the card brand.
  { name: 'Visa', test: (t) => /entry\s*permit|(visit|tourist|transit|employment)\s*visa|تأشيرة|تاشيرة/i.test(t) },
  { name: 'Passport', test: (t, mrz) => mrz?.format === 'td3' || /\bpassport\b(?!\s*(no|number|#))|جواز\s*(ال)?سفر/i.test(t) },
  { name: 'Tenancy Contract', test: (t) => /tenancy\s*(contract|agreement)|\bejari\b|عقد\s*(ال)?إيجار/i.test(t) },
  { name: 'Rental Contract', test: (t) => /rental\s*(contract|agreement)|عقد\s*(ال)?تأجير/i.test(t) },
];

// Sure enough to beat a broad kind guessed from keywords (classify.ts tops out at 0.9 only on
// an MRZ or ID number, which also names the type here).
const CONFIDENCE = 0.85;

export function detectDocumentType(text: string, mrz: Mrz | null): Guess<string> | undefined {
  const found = TYPES.find((t) => t.test(text, mrz));
  return found ? { value: found.name, confidence: CONFIDENCE } : undefined;
}

// The tag to suggest for what was read: the document's own type when it has one (a tag the user
// already has under that name, ignoring case, else a new one), otherwise the broad kind's tag ("ID").
// "Other" suggests nothing: such a card is simply left untagged.
export function suggestedTag(
  analysis: Pick<CardAnalysis, 'category' | 'documentType'>,
  known: readonly string[],
): Guess<string[]> | undefined {
  if (analysis.documentType) {
    const tag = resolveTag(analysis.documentType.value, known);
    if (tag) return { value: [tag], confidence: analysis.documentType.confidence };
  }
  if (!analysis.category || analysis.category.value === 'other') return undefined;
  const tag = resolveTag(strings.tags.starters[analysis.category.value], known);
  return tag ? { value: [tag], confidence: analysis.category.confidence } : undefined;
}

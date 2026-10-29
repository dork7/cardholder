import { Category } from '../cards/types';
import { EMIRATES_ID, isBirthCertificate } from './fields';
import { normalizeDigits } from './smartExtract';
import { Mrz } from './mrz';
import { Guess } from './types';

// Keyword rules on the card's text (phase 3a of the on-device AI plan). A strong sign, like a valid
// MRZ or an Emirates ID number, settles it; otherwise the category with the most weighted hits wins.
const RULES: Record<Exclude<Category, 'other'>, [RegExp, number][]> = {
  id: [
    [/identity|\bid\s*card|national\s*id|resident|passport|driving\s*licen[cs]e|driver'?s?\s*licen[cs]e/i, 3],
    [/nationality|date\s*of\s*birth|\bdob\b|\bsex\b|place\s*of\s*birth/i, 2],
    [/هوية|جواز|رخصة\s*قيادة|الجنسية/, 3],
  ],
  insurance: [
    [/insurance|insured|assurance|takaful/i, 3],
    [/policy|\bhealth\b|medical|network|\bclaims?\b|\bdaman\b|\bthiqa\b|\baxa\b|\bbupa\b|\bnas\b|\bneuron\b|\bmetlife\b|\bcigna\b/i, 2],
    [/تأمين|صحي|بوليصة/, 3],
  ],
  membership: [
    [/membership|\bclub\b|\bgym\b|fitness|loyalty|rewards?|points|library|\bvip\b/i, 3],
    [/\bmember\b/i, 1], // insurance cards say "Member Name" too, so on its own it is a weak sign
    [/عضوية|نادي|مكتبة/, 3],
  ],
};

export function classifyCard(text: string, mrz: Mrz | null): Guess<Category> | undefined {
  if (mrz) return { value: 'id', confidence: 0.95 };
  if (EMIRATES_ID.test(normalizeDigits(text))) return { value: 'id', confidence: 0.95 };
  if (isBirthCertificate(text)) return { value: 'id', confidence: 0.9 };

  const scores = (Object.keys(RULES) as (keyof typeof RULES)[]).map((category) => ({
    category,
    score: RULES[category].reduce((sum, [pattern, weight]) => sum + (pattern.test(text) ? weight : 0), 0),
  }));
  scores.sort((a, b) => b.score - a.score);
  const [first, second] = scores;
  // Nothing matched, or two categories tie: no suggestion rather than a coin toss.
  if (first.score === 0 || first.score === second.score) return undefined;
  const margin = first.score - second.score;
  return { value: first.category, confidence: Math.min(0.9, 0.55 + 0.1 * margin) };
}

import { MAX_TAGS } from '../config';
import { EMIRATES_ID } from './fields';
import { Mrz } from './mrz';
import { normalizeDigits } from './smartExtract';
import { Guess } from './types';

// Keyword rules on the card's text, like classify.ts, but a card can earn several tags: a health
// insurance card through work is "Health", "Insurance" and "Work". Runs on the phone; nothing is sent.
// Listed in the order tags are shown.
const RULES: [string, RegExp[]][] = [
  ['Government', [/government|ministry|federal|authority|\bicp\b|identity|resident|emirates\s*id/i, /حكومة|وزارة|هيئة|الهوية/]],
  ['Travel', [/passport|\bvisa\b(?!\s*(card|debit|credit))|airline|airways|frequent\s*flyer|\bmiles\b|skywards|etihad\s*guest/i, /جواز|تأشيرة|سفر/]],
  ['Driving', [/driving\s*licen[cs]e|driver'?s?\s*licen[cs]e|vehicle|traffic|\brta\b/i, /رخصة|مركبة|مرور/]],
  ['Health', [/\bhealth\b|medical|hospital|clinic|pharmacy|dental|\bthiqa\b|\bdaman\b/i, /صحي|صحة|مستشفى|طبي/]],
  ['Insurance', [/insurance|insured|assurance|takaful|policy\s*(no|number|#)/i, /تأمين|بوليصة/]],
  ['Work', [/employee|employer|\bstaff\b|work\s*permit|labou?r\s*card|occupation|profession|corporate|\bemp\.?\s*(no|id)\b/i, /موظف|عمل|المهنة/]],
  ['Finance', [/\bbank\b|credit\s*card|debit|mastercard|\biban\b|visa\s*(card|debit|credit)/i, /بنك|مصرف/]],
  ['Education', [/university|college|school|student|academy|library/i, /جامعة|كلية|مدرسة|طالب|مكتبة/]],
  ['Fitness', [/\bgym\b|fitness|yoga|sports?\s*club|leisure\s*club/i, /رياضي|لياقة/]],
  ['Shopping', [/loyalty|rewards?|\bpoints\b|\bmall\b|supermarket|hypermarket|shopping/i, /تسوق|نقاط/]],
];

// One confidence for the set: each rule is a plain keyword hit, and the user reviews them before saving.
const CONFIDENCE = 0.7;

export function suggestTags(text: string, mrz: Mrz | null): Guess<string[]> | undefined {
  const tags = RULES.filter(([, patterns]) => patterns.some((p) => p.test(text))).map(([tag]) => tag);
  // An MRZ or an Emirates ID number is an official document even when its words weren't read.
  const official = mrz !== null || EMIRATES_ID.test(normalizeDigits(text));
  if (official && !tags.includes('Government')) tags.unshift('Government');
  if (mrz?.format === 'td3' && !tags.includes('Travel')) tags.push('Travel');
  if (tags.length === 0) return undefined;
  return { value: tags.slice(0, MAX_TAGS), confidence: CONFIDENCE };
}

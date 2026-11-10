import { normalizeDigits } from '../analysis/smartExtract';
import { categoryLabel } from '../cards/categories';
import { displayName } from '../cards/display';
import { Card } from '../cards/types';
import { lookupHeader, parseLookup } from './lookup';
import { AskModel, parseJsonObject } from './model';

// Asking a question about the documents, in the order the user described:
//   1. the model reads the master lookup file and names the documents most likely to hold the answer;
//   2. it reads the first of those documents' own Markdown and answers from it, or says it isn't there
//      (a document too long for the model is read in parts, up to MAX_PARTS of them);
//   3. if it isn't, it moves on to the next document, up to MAX_CHECKED.
// Word matching backs up step 1 (a small model can pick badly), and every answer must be backed by a
// line of the document it came from, so the model can't make one up.

export const MAX_CHECKED = 4;
// A question longer than this is cut: it has to leave room in the prompt for the document.
export const MAX_QUESTION_CHARS = 300;

export type AskStep = { kind: 'lookup' } | { kind: 'document'; card: Card; n: number; of: number };

export type AskResult =
  | { kind: 'answer'; answer: string; evidence: string; card: Card; checked: Card[] }
  | { kind: 'not-found'; checked: Card[] };

export interface AskInput {
  question: string;
  cards: readonly Card[];
  lookup: string; // the master lookup file's Markdown
  documentMarkdown: (card: Card) => string;
  model: AskModel;
  signal: AbortSignal;
  onProgress?: (step: AskStep) => void;
}

export class AskStoppedError extends Error {
  constructor() {
    super('Asking was stopped');
  }
}

// ---- Word matching ----

const STOP_WORDS = new Set(
  'a an and are as at be by can do does for from has have how i in is it its me my of on or our the their this to was what when where which who whose why will with you your'.split(
    ' ',
  ),
);

// Words people use for the same thing; each group is matched as one.
const SYNONYMS: string[][] = [
  ['car', 'vehicle', 'mulkiya', 'licence', 'license', 'registration'],
  ['id', 'identity', 'emirates', 'passport'],
  ['insurance', 'policy', 'cover', 'insurer', 'insured'],
  ['expire', 'expires', 'expiry', 'expiration', 'valid', 'until'],
  ['birth', 'born', 'dob'],
  ['number', 'no', 'num'],
  ['visa', 'residence', 'residency', 'permit'],
  ['rent', 'rental', 'lease', 'tenancy', 'ejari'],
];

const normalize = (s: string) => normalizeDigits(s).toLocaleLowerCase();
// The words and numbers in a text, lower-cased, without punctuation.
const tokens = (s: string) => normalize(s).split(/[^\p{L}\p{N}]+/u).filter((t) => t.length > 0);
const hasAnyOf = (group: string[], text: string) => group.some((w) => text.includes(w));

export function questionWords(question: string): string[][] {
  const words = tokens(question).filter((w) => w.length > 1 && !STOP_WORDS.has(w));
  return [...new Set(words)].map((w) => SYNONYMS.find((group) => group.includes(w)) ?? [w]);
}

// How well a document matches the question's words: its name, category and tags count most.
export function score(card: Card, words: string[][]): number {
  const head = normalize(`${displayName(card)} ${categoryLabel(card.category)} ${card.tags.join(' ')}`);
  const body = card.readText ? normalize(`${card.readText.front} ${card.readText.back}`) : '';
  let total = 0;
  for (const group of words) {
    if (hasAnyOf(group, head)) total += 3;
    else if (hasAnyOf(group, body)) total += 1;
  }
  return total;
}

// ---- Grounding: an answer must be in its document ----

// Letters and digits only, so spacing, dashes and case don't decide whether text matches.
const compact = (s: string) => normalize(s).replace(/[^\p{L}\p{N}]/gu, '');

export function isGrounded(found: string, documentText: string): boolean {
  const needle = compact(found);
  return needle.length >= 2 && compact(documentText).includes(needle);
}

// The line of the document that holds the answer, to show as its evidence.
function lineWith(answer: string, documentText: string): string | null {
  const needle = compact(answer);
  return documentText.split('\n').find((line) => needle.length >= 2 && compact(line).includes(needle))?.trim() ?? null;
}

const hasDigit = (t: string) => /\p{N}/u.test(t);
const isDocumentLine = (line: string) => line !== '' && !line.startsWith('```');

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
// 1 to 12 for a month's name or its short form ("mar", "sept"), else null.
const monthNumber = (word: string): number | null => {
  const i = word.length >= 3 ? MONTHS.findIndex((m) => m.startsWith(word)) : -1;
  return i < 0 ? null : i + 1;
};
// "5,000" as one number, so it is never mistaken for a "5" and a "000" found apart.
const joinThousands = (s: string) => s.replace(/(\p{N}),(?=\p{N}{3}(?!\p{N}))/gu, '$1');
// A day or month written "05" or "5" is the same number.
const shortNumber = (t: string) => (/^\d{1,2}$/.test(t) ? String(Number(t)) : t);
const looseTokens = (s: string) => tokens(joinThousands(s)).map(shortNumber);

function holdsAll(have: string[], wanted: string[]): boolean {
  const left = [...have];
  return wanted.every((w) => {
    const i = left.indexOf(w);
    if (i < 0) return false;
    left.splice(i, 1);
    return true;
  });
}

// Small models reword what they copy: "31 May 2027" for "31/05/2027", or a line with its words in
// another order. That still counts, but only when ONE line of the document backs all of it: every
// number in the answer is on that line as written (a month's name may be its number there), or, for an
// answer with no numbers, every word is. Numbers picked from different lines, a different month, a
// different amount or a word the line doesn't have are turned away. Returns that line, or null.
export function looselyGroundedLine(found: string, documentText: string): string | null {
  const words = looseTokens(found).filter((t) => !STOP_WORDS.has(t));
  const numbers = words.filter(hasDigit);
  const letters = words.filter((w) => !hasDigit(w) && w.length >= 3);
  if (numbers.length === 0 && letters.length === 0) return null;
  const months = numbers.length > 0 ? letters.map(monthNumber).filter((m): m is number => m !== null) : [];
  for (const raw of documentText.split('\n')) {
    const line = raw.trim();
    if (!isDocumentLine(line)) continue;
    const lineTokens = looseTokens(line);
    if (numbers.length === 0) {
      if (letters.every((w) => lineTokens.includes(w))) return line;
      continue;
    }
    // A month the line doesn't name must be there as a number of its own, besides the day and year.
    const monthsAsNumbers = months.filter((m) => !lineTokens.some((t) => monthNumber(t) === m)).map(String);
    if (holdsAll(lineTokens.filter(hasDigit), [...numbers, ...monthsAsNumbers])) return line;
  }
  return null;
}

// The document's line sharing the most words with a quote that runs over more than one line.
function closestLine(quote: string, documentText: string): string | null {
  const wanted = new Set(tokens(quote).filter((t) => !STOP_WORDS.has(t)));
  let best: { line: string; shared: number } | null = null;
  for (const raw of documentText.split('\n')) {
    const line = raw.trim();
    if (!isDocumentLine(line)) continue;
    const shared = new Set(tokens(line).filter((t) => wanted.has(t))).size;
    if (shared > 0 && (!best || shared > best.shared)) best = { line, shared };
  }
  return best?.line ?? null;
}

// ---- Prompts ----

const PICK_SCHEMA = {
  type: 'object',
  properties: { documents: { type: 'array', items: { type: 'integer' }, maxItems: 3 } },
  required: ['documents'],
};

const ANSWER_SCHEMA = {
  type: 'object',
  properties: { found: { type: 'boolean' }, answer: { type: 'string' }, evidence: { type: 'string' } },
  required: ['found', 'answer', 'evidence'],
};

const PICK_SYSTEM =
  'You choose which of the user\'s documents could answer a question, using the lookup table of their documents. ' +
  'Reply only with JSON: {"documents": [row numbers, best first, at most 3]}. Reply {"documents": []} if none could.';

const ANSWER_SYSTEM =
  'You answer a question using only the document text given (it may be one part of a longer document, and the text ' +
  'was read off a photo, so it can have typos). Never guess or use outside knowledge. ' +
  'Reply only with JSON: {"found": true, "answer": "short answer, copied as written in the document", ' +
  '"evidence": "the line of the document it comes from, copied exactly, at most 20 words"}, ' +
  'or {"found": false, "answer": "", "evidence": ""} if the text does not say.';

// Enough for a short answer and a quoted line, in Arabic too. Less, and the reply is cut off mid-JSON.
const ANSWER_TOKENS = 256;
// A long document is read in parts that fit the model, the parts with the question's words first.
const MAX_PARTS = 3;
// The smallest part worth putting to the model; below this a failed read is not tried again in halves.
const MIN_PART_CHARS = 200;

// The lookup rows that fit in the prompt, the best word matches first so they're never the ones cut.
function lookupForPrompt(lookup: string, cards: readonly Card[], words: string[][], chars: number): string {
  if (lookup.length <= chars) return lookup;
  const byId = new Map(cards.map((c) => [c.id, c]));
  const rows = parseLookup(lookup).sort((a, b) => {
    const ca = byId.get(a.id);
    const cb = byId.get(b.id);
    return (cb ? score(cb, words) : 0) - (ca ? score(ca, words) : 0);
  });
  const kept: string[] = [];
  let used = lookupHeader().length + 1;
  for (const row of rows) {
    if (used + row.line.length + 1 > chars) break;
    kept.push(row.line);
    used += row.line.length + 1;
  }
  return `${lookupHeader()}\n${kept.join('\n')}`;
}

// The document in parts that each fit in `chars`, split between lines. The first part (the name and
// details) always comes first; the others in order of how many of the question's words they hold.
export function documentParts(markdown: string, words: string[][], room: number): string[] {
  const chars = Math.max(MIN_PART_CHARS, room); // never zero or less, or the splitting below would not end
  if (markdown.length <= chars) return [markdown];
  const parts: string[] = [];
  let current = '';
  for (const line of markdown.split('\n')) {
    for (let rest = line; ; ) {
      const room = chars - current.length - (current ? 1 : 0);
      if (rest.length <= room) {
        current = current ? `${current}\n${rest}` : rest;
        break;
      }
      if (current) {
        parts.push(current);
        current = '';
        continue;
      }
      parts.push(rest.slice(0, chars)); // one line longer than a whole part
      rest = rest.slice(chars);
      if (rest === '') break;
    }
  }
  if (current) parts.push(current);
  const questionWordsIn = (part: string) => {
    const text = normalize(part);
    return words.filter((group) => hasAnyOf(group, text)).length;
  };
  const [first, ...others] = parts;
  return [first, ...others.map((part, i) => ({ part, i, n: questionWordsIn(part) })).sort((a, b) => b.n - a.n || a.i - b.i).map((p) => p.part)];
}

export interface AnswerReply {
  found: boolean;
  answer: string;
  evidence: string;
}

// The model's answer, even when it ran out of room and the JSON was cut off. A cut-off reply is used
// only if the answer itself was finished: half a passport number would still be found in the document.
export function parseAnswer(raw: string): AnswerReply | null {
  const json = parseJsonObject(raw);
  if (json) {
    return {
      found: json.found === true,
      answer: typeof json.answer === 'string' ? json.answer.trim() : '',
      evidence: typeof json.evidence === 'string' ? json.evidence.trim() : '',
    };
  }
  // A field's text, only if its closing quote arrived.
  const finished = (name: string): string | null => {
    const m = raw.match(new RegExp(`"${name}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`));
    if (!m) return null;
    try {
      return (JSON.parse(`"${m[1]}"`) as string).trim();
    } catch {
      return m[1].trim();
    }
  };
  if (!/"found"\s*:\s*true/.test(raw)) return null;
  const answer = finished('answer');
  return answer === null ? null : { found: true, answer, evidence: finished('evidence') ?? '' };
}

// A quote of a few letters ("ID") would match almost any document, so it has to be a real line.
const MIN_QUOTE_CHARS = 6;

// The line of the document that backs the answer, to show as its evidence, or null if none does.
// The quoted line, or the answer itself, must be in the document as written; failing that, one line
// must hold everything in the answer (see looselyGroundedLine).
function evidenceFor(answer: string, quote: string, markdown: string): string | null {
  if (compact(quote).length >= MIN_QUOTE_CHARS && isGrounded(quote, markdown)) {
    const line = lineWith(quote, markdown) ?? lineWith(answer, markdown) ?? closestLine(quote, markdown);
    if (line) return line;
  }
  if (isGrounded(answer, markdown)) {
    const line = lineWith(answer, markdown) ?? closestLine(answer, markdown);
    if (line) return line;
  }
  return looselyGroundedLine(answer, markdown);
}

// A text cut in two at the line break nearest its middle.
function halves(text: string): string[] {
  const middle = Math.ceil(text.length / 2);
  const lineBreak = text.lastIndexOf('\n', middle);
  const at = lineBreak > 0 ? lineBreak : middle;
  return [text.slice(0, at), text.slice(at)];
}

// ---- The question ----

export async function askDocuments(input: AskInput): Promise<AskResult> {
  const { cards, lookup, model, signal, onProgress } = input;
  const question = input.question.trim().slice(0, MAX_QUESTION_CHARS);
  const stopIfAsked = () => {
    if (signal.aborted) throw new AskStoppedError();
  };
  const words = questionWords(question);
  const byId = new Map(cards.map((c) => [c.id, c]));

  // 1. The lookup file: which documents to open.
  onProgress?.({ kind: 'lookup' });
  stopIfAsked();
  const rows = parseLookup(lookup);
  const picked: Card[] = [];
  const pickPrompt = `Question: ${question}\n\nLookup table:\n`;
  try {
    const raw = await model.generate(
      {
        system: PICK_SYSTEM,
        user: pickPrompt + lookupForPrompt(lookup, cards, words, model.promptChars - pickPrompt.length - PICK_SYSTEM.length),
      },
      { maxTokens: 32, schema: PICK_SCHEMA },
      signal,
    );
    const numbers = parseJsonObject(raw)?.documents;
    for (const n of Array.isArray(numbers) ? numbers : []) {
      const card = byId.get(rows.find((r) => r.index === n)?.id ?? '');
      if (card && !picked.includes(card)) picked.push(card);
    }
  } catch (e) {
    stopIfAsked();
    console.warn('Reading the lookup file failed', e); // fall back to word matching alone
  }

  // The model's picks first, then the best word matches, then the rest of the lookup file in order.
  const lookupOrder = rows.map((r) => byId.get(r.id)).filter((c): c is Card => !!c);
  const ranked = [...cards].sort((a, b) => score(b, words) - score(a, words));
  const order: Card[] = [];
  for (const card of [...picked, ...ranked.filter((c) => score(c, words) > 0), ...lookupOrder]) {
    if (!order.includes(card)) order.push(card);
  }
  const candidates = order.slice(0, MAX_CHECKED);

  // 2–3. Each document in turn, until one answers.
  const head = `Question: ${question}\n\nDocument:\n`;
  const room = model.promptChars - head.length - ANSWER_SYSTEM.length;
  const checked: Card[] = [];

  // One piece of a document, put to the model: the answer if it gives one the document backs. If the
  // model fails on it (too long for it, say), both halves are tried once each.
  const answerIn = async (card: Card, markdown: string, text: string, mayHalve: boolean): Promise<AskResult | null> => {
    let reply: AnswerReply | null;
    try {
      reply = parseAnswer(await model.generate({ system: ANSWER_SYSTEM, user: head + text }, { maxTokens: ANSWER_TOKENS, schema: ANSWER_SCHEMA }, signal));
    } catch (e) {
      stopIfAsked();
      console.warn('Reading a document failed', e);
      if (!mayHalve || text.length < MIN_PART_CHARS) return null;
      for (const half of halves(text)) {
        const result = await answerIn(card, markdown, half, false);
        if (result) return result;
      }
      return null;
    }
    if (!reply || !reply.found || reply.answer === '') return null;
    const evidence = evidenceFor(reply.answer, reply.evidence, markdown);
    if (evidence) return { kind: 'answer', answer: reply.answer, evidence, card, checked };
    console.warn('An answer was not in its document, so it was not used'); // never the text itself: it is the user's document
    return null;
  };

  for (const [i, card] of candidates.entries()) {
    stopIfAsked();
    onProgress?.({ kind: 'document', card, n: i + 1, of: candidates.length });
    checked.push(card);
    const markdown = input.documentMarkdown(card);
    for (const part of documentParts(markdown, words, room).slice(0, MAX_PARTS)) {
      stopIfAsked();
      const result = await answerIn(card, markdown, part, true);
      if (result) return result;
    }
  }
  return { kind: 'not-found', checked };
}

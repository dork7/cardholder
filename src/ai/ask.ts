import { normalizeDigits } from '../analysis/smartExtract';
import { categoryLabel } from '../cards/categories';
import { displayName } from '../cards/display';
import { Card } from '../cards/types';
import { lookupHeader, parseLookup } from './lookup';
import { AskModel, parseJsonObject } from './model';

// Asking a question about the documents, in the order the user described:
//   1. the model reads the master lookup file and names the documents most likely to hold the answer;
//   2. it reads the first of those documents' own Markdown and answers from it, or says it isn't there;
//   3. if it isn't, it moves on to the next document, up to MAX_CHECKED.
// Word matching backs up step 1 (a small model can pick badly), and every answer must be found in the
// document it came from, so the model can't make one up.

export const MAX_CHECKED = 4;

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

export function questionWords(question: string): string[][] {
  const words = normalize(question)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
  return [...new Set(words)].map((w) => SYNONYMS.find((group) => group.includes(w)) ?? [w]);
}

// How well a document matches the question's words: its name, category and tags count most.
export function score(card: Card, words: string[][]): number {
  const head = normalize(`${displayName(card)} ${categoryLabel(card.category)} ${card.tags.join(' ')}`);
  const body = card.readText ? normalize(`${card.readText.front} ${card.readText.back}`) : '';
  let total = 0;
  for (const group of words) {
    if (group.some((w) => head.includes(w))) total += 3;
    else if (group.some((w) => body.includes(w))) total += 1;
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
  'You answer a question using only the one document given. Never guess or use outside knowledge. ' +
  'Reply only with JSON: {"found": true, "answer": "short answer", "evidence": "the exact line of the document it comes from"}, ' +
  'or {"found": false, "answer": "", "evidence": ""} if the document does not say.';

const clip = (text: string, chars: number) => (text.length > chars ? `${text.slice(0, Math.max(0, chars - 1))}…` : text);

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

// ---- The question ----

export async function askDocuments(input: AskInput): Promise<AskResult> {
  const { question, cards, lookup, model, signal, onProgress } = input;
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
  const checked: Card[] = [];
  for (const [i, card] of candidates.entries()) {
    stopIfAsked();
    onProgress?.({ kind: 'document', card, n: i + 1, of: candidates.length });
    checked.push(card);
    const markdown = input.documentMarkdown(card);
    const head = `Question: ${question}\n\nDocument:\n`;
    let reply: Record<string, unknown> | null = null;
    try {
      const raw = await model.generate(
        { system: ANSWER_SYSTEM, user: head + clip(markdown, model.promptChars - head.length - ANSWER_SYSTEM.length) },
        { maxTokens: 96, schema: ANSWER_SCHEMA },
        signal,
      );
      reply = parseJsonObject(raw);
    } catch (e) {
      stopIfAsked();
      console.warn('Reading a document failed', e);
      continue;
    }
    const answer = typeof reply?.answer === 'string' ? reply.answer.trim() : '';
    const evidence = typeof reply?.evidence === 'string' ? reply.evidence.trim() : '';
    if (reply?.found !== true || answer === '') continue;
    // Kept only if the document really says it: the quoted line, or the answer itself, is in it.
    // A quote of a few letters ("ID") would match almost any document, so it has to be a real line.
    if (compact(evidence).length >= 6 && isGrounded(evidence, markdown)) return { kind: 'answer', answer, evidence, card, checked };
    if (isGrounded(answer, markdown)) return { kind: 'answer', answer, evidence: lineWith(answer, markdown) ?? answer, card, checked };
  }
  return { kind: 'not-found', checked };
}

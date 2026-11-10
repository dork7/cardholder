import { SmartSuggestion } from '../../analysis/smartExtract';

// Scores for the development bench (app/dev/models.tsx, docs/model-bench.md): how many of a card's
// expected fields a model read, and whether an answer holds the expected value.

export interface CardCase {
  id: string;
  text: string; // the card's text, as OCR reads it
  expect: Partial<Record<'name' | 'expiresOn' | 'category', string>>;
}

export interface AskCase {
  id: string;
  question: string;
  expect: string; // the answer must contain this
}

export interface BenchRow {
  model: string;
  nCtx: number;
  onGpu: boolean | null;
  validJson: number;
  cards: number;
  fields: number;
  correct: number;
  answers: number;
  questions: number;
  slowestCardMs: number;
  medianFirstWordMs: number; // from asking the model to its first written text, first call of a question
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

export function scoreCard(c: CardCase, s: SmartSuggestion | null): { fields: number; correct: number } {
  const keys = Object.keys(c.expect) as (keyof CardCase['expect'])[];
  const correct = keys.filter((k) => {
    const got = s?.[k];
    return typeof got === 'string' && norm(got) === norm(c.expect[k]!);
  }).length;
  return { fields: keys.length, correct };
}

export function scoreAnswer(c: AskCase, answer: string | null): boolean {
  return answer !== null && norm(answer).includes(norm(c.expect));
}

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)} s`;

export function toMarkdown(rows: readonly BenchRow[]): string {
  const head = '| Model | Context | Runs on | Valid JSON | Card fields | Answers | Slowest card | Median first word |';
  const rule = '|---|---|---|---|---|---|---|---|';
  const body = rows.map(
    (r) =>
      `| ${r.model} | ${r.nCtx} | ${r.onGpu === null ? '?' : r.onGpu ? 'GPU' : 'CPU'} | ${r.validJson}/${r.cards} | ${r.correct}/${r.fields} | ${r.answers}/${r.questions} | ${seconds(r.slowestCardMs)} | ${seconds(r.medianFirstWordMs)} |`,
  );
  return [head, rule, ...body].join('\n');
}

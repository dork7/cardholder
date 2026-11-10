import { ExtractRun } from '../../analysis/localModel';
import { cardMarkdown } from '../../cards/cardMarkdown';
import { askDocuments } from '../ask';
import { buildLookup } from '../lookup';
import { AskModel, parseJsonObject } from '../model';
import { ASK_CASES, ASK_DOCS, CARD_CASES } from './cases';
import { BenchRow, scoreAnswer, scoreCard } from './score';

// One bench run (app/dev/models.tsx): every card case through card reading, every question through
// asking, on the model that is loaded. "First word" is the time from putting a question to the model
// until it starts to write: loading it if need be, and reading the lookup table.

export interface EvalInput {
  label: string;
  nCtx: number;
  extract: (text: string) => Promise<ExtractRun>;
  askModel: (onFirstWord: () => void) => AskModel; // tells the bench when the model starts to write
  onGpu: () => boolean | null;
  now: () => number;
  signal: AbortSignal;
  onStep?: (done: number, of: number) => void;
}

const median = (xs: number[]) => {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

export async function runEval(input: EvalInput): Promise<BenchRow> {
  const { extract, now, signal } = input;
  const total = CARD_CASES.length + ASK_CASES.length;
  let done = 0;
  const step = () => input.onStep?.(++done, total);
  const stopped = () => {
    if (signal.aborted) throw new Error('The bench run was stopped');
  };

  let validJson = 0;
  let fields = 0;
  let correct = 0;
  let slowestCardMs = 0;
  for (const c of CARD_CASES) {
    stopped();
    const start = now();
    const run = await extract(c.text);
    slowestCardMs = Math.max(slowestCardMs, now() - start);
    if (parseJsonObject(run.raw)) validJson++;
    const score = scoreCard(c, run.suggestion);
    fields += score.fields;
    correct += score.correct;
    step();
  }

  const lookup = buildLookup(ASK_DOCS, new Date());
  const firstWords: number[] = [];
  let answers = 0;
  for (const q of ASK_CASES) {
    stopped();
    let start: number | null = null;
    let first: number | null = null;
    const model = input.askModel(() => {
      if (first === null && start !== null) first = now() - start;
    });
    const timed: AskModel = {
      ...model,
      generate: (prompt, options, s) => {
        start ??= now();
        return model.generate(prompt, options, s);
      },
    };
    const result = await askDocuments({
      question: q.question,
      cards: ASK_DOCS,
      lookup,
      documentMarkdown: (card) => cardMarkdown(card, []),
      model: timed,
      signal,
    });
    if (first !== null) firstWords.push(first);
    if (scoreAnswer(q, result.kind === 'answer' ? result.answer : null)) answers++;
    step();
  }

  return {
    model: input.label,
    nCtx: input.nCtx,
    onGpu: input.onGpu(),
    validJson,
    cards: CARD_CASES.length,
    fields,
    correct,
    answers,
    questions: ASK_CASES.length,
    slowestCardMs,
    medianFirstWordMs: median(firstWords),
  };
}

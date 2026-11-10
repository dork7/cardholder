import { ASK_CASES, CARD_CASES } from '../eval/cases';
import { runEval } from '../eval/runEval';
import { AskModel } from '../model';

const signal = () => new AbortController().signal;

test('runs every card and question, scoring them, with timings', async () => {
  let t = 0;
  const extract = jest.fn(async (text: string) => {
    const c = CARD_CASES.find((x) => x.text === text)!;
    t += 1000;
    return {
      suggestion: { name: c.expect.name ?? null, expiresOn: c.expect.expiresOn ?? null, category: (c.expect.category ?? null) as never },
      raw: '{"name":"x"}',
      promptMs: 100,
      predictMs: 200,
      tokensPerSecond: 10,
    };
  });
  // Picks nothing and finds nothing: every question goes unanswered. Each call starts to write after
  // 300 ms and is done after 500.
  const askModel = (onFirstWord: () => void): AskModel => ({
    kind: 'local',
    promptChars: 7000,
    generate: async () => {
      t += 300;
      onFirstWord();
      t += 200;
      return '{"rows":[],"found":false,"answer":"","evidence":""}';
    },
  });
  const row = await runEval({ label: 'Fake', nCtx: 4096, extract, askModel, onGpu: () => false, now: () => t, signal: signal() });
  expect(extract).toHaveBeenCalledTimes(CARD_CASES.length);
  expect(row).toMatchObject({
    model: 'Fake',
    nCtx: 4096,
    onGpu: false,
    cards: CARD_CASES.length,
    validJson: CARD_CASES.length,
    answers: 0,
    questions: ASK_CASES.length,
    slowestCardMs: 1000,
    medianFirstWordMs: 300,
  });
  expect(row.correct).toBe(row.fields);
});

test('a stopped run stops', async () => {
  const controller = new AbortController();
  controller.abort();
  const extract = jest.fn();
  await expect(
    runEval({ label: 'x', nCtx: 4096, extract, askModel: () => ({ kind: 'local', promptChars: 1, generate: jest.fn() }), onGpu: () => null, now: Date.now, signal: controller.signal }),
  ).rejects.toThrow();
  expect(extract).not.toHaveBeenCalled();
});

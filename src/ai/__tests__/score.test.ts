import { scoreAnswer, scoreCard, toMarkdown } from '../eval/score';

test('counts expected card fields matched, ignoring case and spacing', () => {
  const c = { id: 'x', text: '', expect: { name: 'Emirates ID', expiresOn: '2027-05-31' } };
  expect(scoreCard(c, { name: ' emirates  id', expiresOn: '2027-05-31', category: null })).toEqual({ fields: 2, correct: 2 });
  expect(scoreCard(c, { name: 'Emirates', expiresOn: '2027-05-31', category: 'id' })).toEqual({ fields: 2, correct: 1 });
  expect(scoreCard(c, null)).toEqual({ fields: 2, correct: 0 });
});

test('an answer counts when it contains the expected value, ignoring case and spacing', () => {
  const c = { id: 'q', question: '', expect: 'P1234567' };
  expect(scoreAnswer(c, 'Passport number:  p1234567.')).toBe(true);
  expect(scoreAnswer(c, 'P123456')).toBe(false);
  expect(scoreAnswer(c, null)).toBe(false);
});

test('a run becomes a Markdown table row per model', () => {
  const md = toMarkdown([
    { model: 'Qwen2.5 0.5B', nCtx: 4096, onGpu: true, validJson: 4, cards: 4, fields: 10, correct: 8, answers: 3, questions: 4, slowestCardMs: 2100, medianFirstWordMs: 900 },
  ]);
  expect(md.split('\n')[0]).toBe('| Model | Context | Runs on | Valid JSON | Card fields | Answers | Slowest card | Median first word |');
  expect(md).toContain('| Qwen2.5 0.5B | 4096 | GPU | 4/4 | 8/10 | 3/4 | 2.1 s | 0.9 s |');
});

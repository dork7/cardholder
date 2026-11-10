import { makeCard } from '../../../test/fixtures';
import { cardMarkdown } from '../../cards/cardMarkdown';
import { Card } from '../../cards/types';
import { askDocuments, AskStoppedError, isGrounded, MAX_CHECKED, questionWords, score } from '../ask';
import { buildLookup, parseLookup } from '../lookup';
import { AskModel } from '../model';

const NOW = new Date('2026-11-09T10:00:00Z');

const insurance = makeCard({
  id: 'ins',
  name: 'Car insurance',
  category: 'insurance',
  readText: { front: 'ORIENT INSURANCE\nMotor policy\nPolicy expiry: 31/05/2027\nPlate 12345', back: '' },
});
const passport = makeCard({
  id: 'pass',
  name: 'Passport',
  category: 'id',
  readText: { front: 'PASSPORT\nSurname KHAN\nPassport No. P1234567\nDate of expiry 14 MAR 2031', back: '' },
});
const gym = makeCard({ id: 'gym', name: 'Gym', category: 'membership', readText: { front: 'FITNESS FIRST\nMember 8899', back: '' } });
const cards = [insurance, passport, gym];
const lookup = buildLookup(cards, NOW);
const rowOf = (card: Card) => parseLookup(lookup).find((r) => r.id === card.id)!.index;

// A model that answers from a script: what it picks from the lookup file, and what it says about each
// document it is shown. It records which documents it was asked about, in order.
function fakeModel(script: { pick: unknown; answers: Record<string, unknown> }): AskModel & { shown: string[] } {
  const shown: string[] = [];
  return {
    kind: 'local',
    promptChars: 7000,
    shown,
    async generate(prompt) {
      if (prompt.user.includes('Lookup table:')) return typeof script.pick === 'string' ? script.pick : JSON.stringify(script.pick);
      const card = cards.find((c) => prompt.user.includes(`\`${c.id}\``))!;
      shown.push(card.id);
      const reply = script.answers[card.id] ?? { found: false, answer: '', evidence: '' };
      return typeof reply === 'string' ? reply : JSON.stringify(reply);
    },
  };
}

const ask = (question: string, model: AskModel, signal = new AbortController().signal) =>
  askDocuments({ question, cards, lookup, documentMarkdown: (c) => cardMarkdown(c, []), model, signal });

test('reads the lookup file, opens the document it points to, and answers from it with the line it rests on', async () => {
  const model = fakeModel({
    pick: { documents: [rowOf(insurance)] },
    answers: { ins: { found: true, answer: '31 May 2027', evidence: 'Policy expiry: 31/05/2027' } },
  });
  const steps: string[] = [];
  const result = await askDocuments({
    question: 'When does my car insurance expire?',
    cards,
    lookup,
    documentMarkdown: (c) => cardMarkdown(c, []),
    model,
    signal: new AbortController().signal,
    onProgress: (s) => steps.push(s.kind === 'lookup' ? 'lookup' : s.card.id),
  });
  expect(result).toEqual({ kind: 'answer', answer: '31 May 2027', evidence: 'Policy expiry: 31/05/2027', card: insurance, checked: [insurance] });
  expect(steps).toEqual(['lookup', 'ins']);
});

test('when the first document does not say, it checks the next one', async () => {
  const model = fakeModel({
    pick: { documents: [rowOf(gym), rowOf(passport)] },
    answers: { pass: { found: true, answer: 'P1234567', evidence: 'Passport No. P1234567' } },
  });
  const result = await ask("What's my passport number?", model);
  expect(model.shown).toEqual(['gym', 'pass']);
  expect(result).toMatchObject({ kind: 'answer', answer: 'P1234567', card: passport, checked: [gym, passport] });
});

test('an answer the document does not contain is not trusted, and the search goes on', async () => {
  const model = fakeModel({
    pick: { documents: [rowOf(insurance)] },
    answers: { ins: { found: true, answer: '2029', evidence: 'Valid until 2029' } },
  });
  const result = await ask('When does my car insurance expire?', model);
  expect(result.kind).toBe('not-found');
  expect(result.checked[0]).toBe(insurance);
});

test('an answer found in the document counts even if the quoted line was not copied exactly', async () => {
  const model = fakeModel({
    pick: { documents: [rowOf(passport)] },
    answers: { pass: { found: true, answer: 'P1234567', evidence: 'number is P1234567' } },
  });
  const result = await ask('passport number', model);
  expect(result).toMatchObject({ kind: 'answer', evidence: 'Passport No. P1234567' });
});

test('if the lookup reply is unusable, word matching chooses the documents instead', async () => {
  const model = fakeModel({
    pick: 'not json at all',
    answers: { ins: { found: true, answer: '31/05/2027', evidence: 'Policy expiry: 31/05/2027' } },
  });
  const result = await ask('When does the vehicle policy expire?', model);
  expect(model.shown[0]).toBe('ins');
  expect(result.kind).toBe('answer');
});

test('row numbers the lookup file does not have are ignored', async () => {
  const model = fakeModel({ pick: { documents: [99, rowOf(gym)] }, answers: {} });
  await ask('member number', model);
  expect(model.shown[0]).toBe('gym');
});

test(`checks at most ${MAX_CHECKED} documents, then says it could not find it`, async () => {
  const many = Array.from({ length: 8 }, (_, i) => makeCard({ id: `d${i}`, name: `Doc ${i}`, readText: { front: `text ${i}`, back: '' } }));
  const shown: string[] = [];
  const model: AskModel = {
    kind: 'built-in',
    promptChars: 7000,
    async generate(prompt) {
      if (prompt.user.includes('Lookup table:')) return '{"documents": []}';
      shown.push(prompt.user);
      return '{"found": false, "answer": "", "evidence": ""}';
    },
  };
  const result = await askDocuments({
    question: 'anything',
    cards: many,
    lookup: buildLookup(many, NOW),
    documentMarkdown: (c) => cardMarkdown(c, []),
    model,
    signal: new AbortController().signal,
  });
  expect(result.kind).toBe('not-found');
  expect(shown).toHaveLength(MAX_CHECKED);
});

test('stopping ends it straight away', async () => {
  const controller = new AbortController();
  const model: AskModel = {
    kind: 'local',
    promptChars: 7000,
    async generate() {
      controller.abort();
      throw new Error('stopped mid-answer');
    },
  };
  await expect(ask('anything', model, controller.signal)).rejects.toBeInstanceOf(AskStoppedError);
});

test('a lookup file too long for the model keeps the rows that best match the question', async () => {
  const many = Array.from({ length: 60 }, (_, i) => makeCard({ id: `d${i}`, name: `Document ${i}`, readText: { front: 'filler text', back: '' } }));
  const all = [...many, insurance];
  let lookupSeen = '';
  const model: AskModel = {
    kind: 'local',
    promptChars: 1500,
    async generate(prompt) {
      if (prompt.user.includes('Lookup table:')) lookupSeen = prompt.user;
      return '{"documents": [], "found": false, "answer": "", "evidence": ""}';
    },
  };
  await askDocuments({
    question: 'car insurance expiry',
    cards: all,
    lookup: buildLookup(all, NOW),
    documentMarkdown: (c) => cardMarkdown(c, []),
    model,
    signal: new AbortController().signal,
  });
  expect(lookupSeen.length).toBeLessThanOrEqual(1500);
  expect(lookupSeen).toContain('`ins`');
});

test('word matching understands related words and counts the name most', () => {
  const words = questionWords('When does my vehicle licence expire?');
  expect(score(insurance, words)).toBeGreaterThan(score(gym, words));
  expect(score(makeCard({ name: 'Mulkiya' }), questionWords('car'))).toBe(3);
});

test('grounding ignores case, spacing, dashes and Arabic-Indic digits', () => {
  expect(isGrounded('784-1990-1234567', 'ID 784 1990 1234567')).toBe(true);
  expect(isGrounded('٣١/٠٥/٢٠٢٧', 'expiry 31/05/2027')).toBe(true);
  expect(isGrounded('2029', 'expiry 31/05/2027')).toBe(false);
});

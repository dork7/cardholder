import { makeCard } from '../../../test/fixtures';
import { cardMarkdown } from '../../cards/cardMarkdown';
import { Card } from '../../cards/types';
import { askDocuments, AskStoppedError, documentParts, isGrounded, looselyGroundedLine, MAX_CHECKED, MAX_QUESTION_CHARS, parseAnswer, questionWords, score } from '../ask';
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

test('a reply cut off mid-JSON still gives its answer', async () => {
  const model = fakeModel({
    pick: { documents: [rowOf(passport)] },
    answers: { pass: '{"found": true, "answer": "P1234567", "evidence": "Passport No. P12' },
  });
  const result = await ask('passport number', model);
  expect(result).toMatchObject({ kind: 'answer', answer: 'P1234567', evidence: 'Passport No. P1234567' });
  expect(parseAnswer('{"found": false, "answer": "')).toBeNull();
});

test('a reworded answer counts when its numbers are in the document as written', async () => {
  const model = fakeModel({
    pick: { documents: [rowOf(insurance)] },
    answers: { ins: { found: true, answer: '31 May 2027', evidence: 'Policy expires on 31 May 2027' } },
  });
  const result = await ask('When does my car insurance expire?', model);
  expect(result).toMatchObject({ kind: 'answer', answer: '31 May 2027', card: insurance, evidence: 'Policy expiry: 31/05/2027' });
  expect(looselyGroundedLine('Insurance, Orient', 'ORIENT INSURANCE\nMotor policy')).toBe('ORIENT INSURANCE');
  expect(looselyGroundedLine('31 May 2029', 'Policy expiry: 31/05/2027')).toBeNull();
});

test('a reworded answer must be backed by one line: no mixing lines, other months, other amounts or added words', () => {
  const document = 'Issue date: 01/06/2020\nPolicy expiry: 31/05/2027\nSum insured: AED 5,000\nArea 50 sqm\nDubai Motor Bank\nIslamic affairs';
  expect(looselyGroundedLine('31 May 2027', document)).toBe('Policy expiry: 31/05/2027');
  expect(looselyGroundedLine('1 Jun 2020', document)).toBe('Issue date: 01/06/2020');
  expect(looselyGroundedLine('01 January 2027', document)).toBeNull(); // numbers from two lines
  expect(looselyGroundedLine('31 June 2027', document)).toBeNull(); // the wrong month
  expect(looselyGroundedLine('AED 50,000', document)).toBeNull(); // "50" and "000" are not 50,000
  expect(looselyGroundedLine('Dubai Islamic Bank', document)).toBeNull(); // a word that line doesn't have
  expect(looselyGroundedLine('5 May 2027', 'Renewed 05/06/2027')).toBeNull(); // one 5 can't be both the day and the month
  expect(looselyGroundedLine('14 March 2031', 'Date of expiry 14 MAR 2031')).toBe('Date of expiry 14 MAR 2031');
});

test('a reply cut off in the middle of its answer is not used', async () => {
  expect(parseAnswer('{"found": true, "answer": "P1234')).toBeNull();
  const model = fakeModel({ pick: { documents: [rowOf(passport)] }, answers: { pass: '{"found": true, "answer": "P1234' } });
  expect((await ask('passport number', model)).kind).toBe('not-found');
});

test('the line shown as evidence is always a line of the document', async () => {
  const model = fakeModel({
    pick: { documents: [rowOf(passport)] },
    answers: { pass: { found: true, answer: 'KHAN P1234567', evidence: 'Surname KHAN Passport No. P1234567' } },
  });
  const result = await ask('passport number', model);
  expect(result).toMatchObject({ kind: 'answer', evidence: 'Passport No. P1234567' });
});

test('a very long question is cut, and never stops the document being split', async () => {
  expect(documentParts('one\ntwo\nthree', [], 0)).toEqual(['one\ntwo\nthree']);
  expect(documentParts('x'.repeat(500), [], -5).join('')).toBe('x'.repeat(500));
  const prompts: string[] = [];
  const model: AskModel = {
    kind: 'local',
    promptChars: 7000,
    async generate(prompt) {
      prompts.push(prompt.user);
      return '{"documents": [], "found": false, "answer": "", "evidence": ""}';
    },
  };
  await ask('why '.repeat(3000), model);
  expect(prompts.length).toBeGreaterThan(1);
  expect(prompts.every((p) => p.length <= 7000)).toBe(true);
  expect(prompts[0].split('\n')[0].length).toBeLessThanOrEqual('Question: '.length + MAX_QUESTION_CHARS);
});

test('when the model fails on a part, both halves of it are read', async () => {
  const filler = Array.from({ length: 12 }, (_, i) => `line ${i} of ordinary filler text`).join('\n');
  const doc = makeCard({ id: 'doc', name: 'Contract', readText: { front: `${filler}\nSecurity deposit: AED 5,000`, back: '' } });
  const seen: string[] = [];
  const model: AskModel = {
    kind: 'local',
    promptChars: 7000,
    async generate(prompt) {
      if (prompt.user.includes('Lookup table:')) return '{"documents": [1]}';
      seen.push(prompt.user);
      if (seen.length === 1) throw new Error('input too long');
      return prompt.user.includes('Security deposit')
        ? '{"found": true, "answer": "AED 5,000", "evidence": "Security deposit: AED 5,000"}'
        : '{"found": false, "answer": "", "evidence": ""}';
    },
  };
  const result = await askDocuments({
    question: 'deposit',
    cards: [doc],
    lookup: buildLookup([doc], NOW),
    documentMarkdown: (c) => cardMarkdown(c, []),
    model,
    signal: new AbortController().signal,
  });
  expect(seen).toHaveLength(3); // the whole part, then its first half, then its second
  expect(result).toMatchObject({ kind: 'answer', answer: 'AED 5,000', evidence: 'Security deposit: AED 5,000' });
});

test('a long document is read in parts, the part with the question\'s words first after the start', async () => {
  const filler = Array.from({ length: 200 }, (_, i) => `line ${i} of ordinary filler text`).join('\n');
  const long = makeCard({ id: 'long', name: 'Tenancy contract', readText: { front: `${filler}\nSecurity deposit: AED 5,000\n${filler}`, back: '' } });
  const seen: string[] = [];
  const model: AskModel = {
    kind: 'local',
    promptChars: 2000,
    async generate(prompt) {
      if (prompt.user.includes('Lookup table:')) return '{"documents": [1]}';
      seen.push(prompt.user);
      expect(prompt.user.length).toBeLessThanOrEqual(2000);
      return prompt.user.includes('Security deposit')
        ? '{"found": true, "answer": "AED 5,000", "evidence": "Security deposit: AED 5,000"}'
        : '{"found": false, "answer": "", "evidence": ""}';
    },
  };
  const result = await askDocuments({
    question: 'How much is the security deposit?',
    cards: [long],
    lookup: buildLookup([long], NOW),
    documentMarkdown: (c) => cardMarkdown(c, []),
    model,
    signal: new AbortController().signal,
  });
  expect(result).toMatchObject({ kind: 'answer', answer: 'AED 5,000', card: long });
  expect(seen).toHaveLength(2);
  const parts = documentParts(cardMarkdown(long, []), questionWords('security deposit'), 1500);
  expect(parts.every((p) => p.length <= 1500)).toBe(true);
  expect(parts[1]).toContain('Security deposit');
});

test('when the model fails on a document, it tries again with less of it', async () => {
  let calls = 0;
  const model = fakeModel({ pick: { documents: [rowOf(passport)] }, answers: {} });
  const flaky: AskModel = {
    ...model,
    async generate(prompt, options, signal) {
      if (!prompt.user.includes('Lookup table:') && calls++ === 0) throw new Error('input too long');
      return prompt.user.includes('Lookup table:')
        ? model.generate(prompt, options, signal)
        : '{"found": true, "answer": "P1234567", "evidence": "Passport No. P1234567"}';
    },
  };
  const result = await ask('passport number', flaky);
  expect(result).toMatchObject({ kind: 'answer', card: passport });
});

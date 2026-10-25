import { frontImage, image, makeCard } from '../../../test/fixtures';
import { applyAnalysis, draftFor, editField, formFor, planSave } from '../editForm';

// The limit is switched off in the app for now; these tests keep its rules covered for when it returns.
jest.mock('../../config', () => ({ ...jest.requireActual('../../config'), CARD_LIMIT_ENABLED: true }));

const free = { existing: null, cardCount: 0, unlocked: false };

test('a new card needs a front photo but no name', () => {
  expect(planSave(draftFor(null), free)).toEqual({ kind: 'invalid', errors: ['front-required'] });
  const front = frontImage('f');
  expect(planSave({ ...draftFor(null), front }, free)).toMatchObject({ kind: 'create', fields: { name: '' } });
});

test('a valid new card within the free limit is created', () => {
  const front = frontImage('f');
  const plan = planSave({ ...draftFor(null), name: ' Gym ', category: 'membership', front }, free);
  expect(plan).toEqual({
    kind: 'create',
    fields: { name: 'Gym', category: 'membership', expiresOn: null, tags: [], documentKey: null },
    images: { front, back: null },
  });
});

test('a new card at the free limit goes to the paywall', () => {
  const draft = { ...draftFor(null), name: 'Fifth', front: frontImage('f') };
  expect(planSave(draft, { existing: null, cardCount: 4, unlocked: false })).toEqual({ kind: 'limit-reached' });
  expect(planSave(draft, { existing: null, cardCount: 4, unlocked: true }).kind).toBe('create');
});

test('editing is never limited and sends no image changes when none were made', () => {
  const card = makeCard({ id: 'c9', name: 'Old', hasBack: true, backAspect: 1.5 });
  const plan = planSave({ ...draftFor(card), name: 'New' }, { existing: card, cardCount: 12, unlocked: false });
  expect(plan).toEqual({
    kind: 'update',
    id: 'c9',
    fields: { name: 'New', category: 'membership', expiresOn: null, tags: [], documentKey: null },
    changes: {},
  });
});

test('removing the back, and replacing it', () => {
  const card = makeCard({ hasBack: true, backAspect: 1.5 });
  const ctx = { existing: card, cardCount: 1, unlocked: false };
  expect(planSave({ ...draftFor(card), removeBack: true }, ctx)).toMatchObject({ changes: { back: null } });
  const back = image('new-back');
  expect(planSave({ ...draftFor(card), removeBack: true, back }, ctx)).toMatchObject({ changes: { back } });
});

test('a new front photo is sent on edit', () => {
  const card = makeCard();
  const front = frontImage('new');
  expect(planSave({ ...draftFor(card), front }, { existing: card, cardCount: 1, unlocked: false })).toMatchObject({
    changes: { front },
  });
});

test('draftFor fills from an existing card', () => {
  const card = makeCard({ name: 'Visa', category: 'id', expiresOn: '2027-01-01' });
  expect(draftFor(card)).toEqual({
    name: 'Visa',
    category: 'id',
    expiresOn: '2027-01-01',
    front: null,
    back: null,
    removeBack: false,
    tags: [],
    documentKey: null,
  });
});

describe('suggestions from the photo', () => {
  const guess = <T,>(value: T, confidence: number) => ({ value, confidence });

  test('fill blank fields and the category of a new card', () => {
    const state = applyAnalysis(formFor(null), {
      name: guess('Daman', 0.6),
      expiresOn: guess('2027-12-31', 0.85),
      category: guess('insurance' as const, 0.75),
    });
    expect(state.draft).toMatchObject({ name: 'Daman', expiresOn: '2027-12-31', category: 'insurance' });
    expect(state.suggested).toEqual({ name: 0.6, expiresOn: 0.85, category: 0.75 });
  });

  test("a stronger read (the back's MRZ) replaces a weaker suggestion; a weaker one does not", () => {
    let state = applyAnalysis(formFor(null), { expiresOn: guess('2029-01-01', 0.6) });
    state = applyAnalysis(state, { expiresOn: guess('2030-11-09', 0.95) });
    expect(state.draft.expiresOn).toBe('2030-11-09');
    state = applyAnalysis(state, { expiresOn: guess('2031-01-01', 0.85) });
    expect(state.draft.expiresOn).toBe('2030-11-09');
  });

  test('a field the user set is theirs: its tag goes and suggestions skip it', () => {
    let state = applyAnalysis(formFor(null), { name: guess('Daman', 0.6) });
    state = editField(state, { name: 'Health' });
    expect(state.suggested.name).toBeUndefined();
    state = applyAnalysis(state, { name: guess('Daman', 0.9) });
    expect(state.draft.name).toBe('Health');
  });

  test('an existing card keeps its category and any name it has', () => {
    const card = makeCard({ name: 'Gym', category: 'membership', expiresOn: null });
    const state = applyAnalysis(formFor(card), {
      name: guess('Fitness First', 0.6),
      category: guess('id' as const, 0.95),
      expiresOn: guess('2028-06-30', 0.85),
    });
    expect(state.draft).toMatchObject({ name: 'Gym', category: 'membership', expiresOn: '2028-06-30' });
  });

  test('changing a photo is not a user edit of the fields', () => {
    const state = editField(formFor(null), { front: frontImage('f') });
    expect(state.touched).toEqual([]);
  });
});

describe('suggested tags', () => {
  const tags = (value: string[]) => ({ tags: { value, confidence: 0.7 } });

  test('add to the tags already there, from the front and then the back', () => {
    let state = formFor(makeCard({ tags: ['Mine'] }));
    state = applyAnalysis(state, tags(['Health', 'mine']));
    state = applyAnalysis(state, tags(['Insurance']));
    expect(state.draft.tags).toEqual(['Mine', 'Health', 'Insurance']);
    expect(state.suggested.tags).toBe(0.7);
  });

  test('stop once the user edits the tags', () => {
    const state = editField(formFor(null), { tags: ['Work'] });
    expect(applyAnalysis(state, tags(['Health'])).draft.tags).toEqual(['Work']);
  });

  test('nothing new means no "Suggested" mark', () => {
    const state = applyAnalysis(formFor(makeCard({ tags: ['Health'] })), tags(['health']));
    expect(state.suggested.tags).toBeUndefined();
  });
});

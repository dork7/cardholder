import { frontImage, image, makeCard } from '../../../test/fixtures';
import { acceptFolderOffer, applyAnalysis, applyFolderSuggestion, draftFor, editField, formFor, planSave } from '../editForm';

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
    fields: { name: 'Gym', category: 'membership', expiresOn: null, folderId: null },
    images: { front, back: null },
    newFolder: null,
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
    fields: { name: 'New', category: 'membership', expiresOn: null, folderId: null },
    changes: {},
    newFolder: null,
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
    folderId: null,
    newFolderName: null,
    front: null,
    back: null,
    removeBack: false,
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

describe('folder suggestions', () => {
  test('a fitting folder is picked and marked as suggested', () => {
    const state = applyFolderSuggestion(formFor(null), { kind: 'existing', folderId: 'f1' });
    expect(state.draft.folderId).toBe('f1');
    expect(state.folderSuggested).toBe(true);
  });

  test('no fitting folder: a new one is offered, not chosen, until the user takes it', () => {
    const offered = applyFolderSuggestion(formFor(null), { kind: 'new', name: 'IDs' });
    expect(offered.folderOffer).toBe('IDs');
    expect(offered.draft).toMatchObject({ folderId: null, newFolderName: null });
    const taken = acceptFolderOffer(offered);
    expect(taken.draft).toMatchObject({ folderId: null, newFolderName: 'IDs' });
    expect(taken.folderOffer).toBeNull();
    const front = frontImage('f');
    expect(planSave({ ...taken.draft, front }, free)).toMatchObject({ kind: 'create', newFolder: 'IDs' });
  });

  test("never overrides the user's pick, or the folder an existing card is in", () => {
    const picked = editField(formFor(null), { folderId: 'mine' });
    expect(applyFolderSuggestion(picked, { kind: 'existing', folderId: 'f1' }).draft.folderId).toBe('mine');
    const filed = formFor(makeCard({ folderId: 'kept' }));
    expect(applyFolderSuggestion(filed, { kind: 'existing', folderId: 'f1' }).draft.folderId).toBe('kept');
    expect(applyFolderSuggestion(filed, { kind: 'new', name: 'IDs' }).folderOffer).toBeNull();
  });

  test('an existing folder from one read beats a new-folder offer from another', () => {
    const routed = applyFolderSuggestion(formFor(null), { kind: 'existing', folderId: 'f1' });
    const after = applyFolderSuggestion(routed, { kind: 'new', name: 'IDs' });
    expect(after.draft.folderId).toBe('f1');
    expect(after.folderOffer).toBeNull();
  });

  test('picking a folder drops the offer and the suggested mark', () => {
    const offered = applyFolderSuggestion(formFor(null), { kind: 'new', name: 'IDs' });
    expect(editField(offered, { folderId: 'f2' })).toMatchObject({ folderOffer: null, folderSuggested: false });
  });
});

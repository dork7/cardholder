import { frontImage, image, makeCard } from '../../../test/fixtures';
import { draftFor, planSave } from '../editForm';

const free = { existing: null, cardCount: 0, unlocked: false };

test('a new card needs a name and a front photo', () => {
  expect(planSave(draftFor(null), free)).toEqual({ kind: 'invalid', errors: ['name-required', 'front-required'] });
});

test('a valid new card within the free limit is created', () => {
  const front = frontImage('f');
  const plan = planSave({ ...draftFor(null), name: ' Gym ', category: 'membership', number: '12 34', front }, free);
  expect(plan).toEqual({
    kind: 'create',
    fields: { name: 'Gym', category: 'membership', number: '12 34', notes: null, expiresOn: null },
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
    fields: { name: 'New', category: 'membership', number: null, notes: null, expiresOn: null },
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
  const card = makeCard({ name: 'Visa', category: 'id', number: 'P123', notes: 'n', expiresOn: '2027-01-01' });
  expect(draftFor(card)).toEqual({
    name: 'Visa',
    category: 'id',
    number: 'P123',
    notes: 'n',
    expiresOn: '2027-01-01',
    front: null,
    back: null,
    removeBack: false,
  });
});

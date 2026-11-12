import { validateCardFields } from '../validate';

test('accepts a minimal card and normalises blanks', () => {
  expect(validateCardFields({ name: '  Gym  ', expiresOn: '' })).toEqual({
    ok: true,
    value: { name: 'Gym', expiresOn: null, remindDaysBefore: 14, tags: [], documentKey: null, folderId: null, readText: null, vertical: false, blurPreview: false },
  });
});

test('the name is optional', () => {
  expect(validateCardFields({ name: '   ' })).toEqual({
    ok: true,
    value: { name: '', expiresOn: null, remindDaysBefore: 14, tags: [], documentKey: null, folderId: null, readText: null, vertical: false, blurPreview: false },
  });
  expect(validateCardFields({}).ok).toBe(true);
});

test('keeps a trimmed expiry date', () => {
  expect(validateCardFields({ name: 'Emirates ID', expiresOn: ' 2027-03-01 ' })).toEqual({
    ok: true,
    value: { name: 'Emirates ID', expiresOn: '2027-03-01', remindDaysBefore: 14, tags: [], documentKey: null, folderId: null, readText: null, vertical: false, blurPreview: false },
  });
});

test('reports every problem at once', () => {
  expect(validateCardFields({ name: 'x'.repeat(61), expiresOn: '2027-02-30', tags: 'Work' })).toEqual({
    ok: false,
    errors: ['name-too-long', 'bad-expiry', 'bad-tags'],
  });
});

test('name longer than 60 characters is rejected', () => {
  expect(validateCardFields({ name: 'x'.repeat(61) })).toEqual({ ok: false, errors: ['name-too-long'] });
  expect(validateCardFields({ name: 'x'.repeat(60) }).ok).toBe(true);
});

test('a non-string name (e.g. from a tampered backup) is read as no name', () => {
  expect(validateCardFields({ name: 42 })).toMatchObject({ ok: true, value: { name: '' } });
});

describe('tags', () => {
  const base = { name: 'Gym' };

  test('are trimmed, deduplicated ignoring case, and blanks dropped', () => {
    expect(validateCardFields({ ...base, tags: [' Work ', 'work', '', 'Health  care'] })).toMatchObject({
      ok: true,
      value: { tags: ['Work', 'Health care'] },
    });
  });

  test('missing means none, so older cards and backups still load', () => {
    expect(validateCardFields(base)).toMatchObject({ ok: true, value: { tags: [] } });
  });

  test('too many, too long or not strings is rejected', () => {
    for (const tags of [Array.from({ length: 9 }, (_, i) => `t${i}`), ['x'.repeat(25)], [1], 'Work']) {
      expect(validateCardFields({ ...base, tags })).toEqual({ ok: false, errors: ['bad-tags'] });
    }
  });
});

describe('a backup from before categories became tags', () => {
  test("the category becomes the card's first tag: a built-in by its label, a typed one tidied", () => {
    expect(validateCardFields({ category: 'insurance' })).toMatchObject({ ok: true, value: { tags: ['Insurance'] } });
    expect(validateCardFields({ category: '  Vehicle   papers ', tags: ['Family'] })).toMatchObject({
      ok: true,
      value: { tags: ['Vehicle papers', 'Family'] },
    });
    expect(validateCardFields({ category: 'id', tags: ['family', 'ID'] })).toMatchObject({ ok: true, value: { tags: ['ID', 'family'] } });
  });

  test('Other, Loyalty and anything unusable leave the card untagged, and never block the import', () => {
    for (const category of ['other', 'loyalty', '   ', 'x'.repeat(25), null, 7]) {
      expect(validateCardFields({ name: 'Coffee', category })).toMatchObject({ ok: true, value: { tags: [] } });
    }
  });

  test('it is added even to a card already at the tag limit, so no tag is lost', () => {
    const tags = Array.from({ length: 8 }, (_, i) => `t${i}`);
    expect(validateCardFields({ category: 'id', tags })).toMatchObject({ ok: true, value: { tags: ['ID', ...tags] } });
  });

  test('the category itself is not kept', () => {
    const result = validateCardFields({ category: 'id' });
    expect(result.ok && 'category' in result.value).toBe(false);
  });
});

test('reminder days: a whole number from 1 to 365, typed or stored; missing means 14', () => {
  const remind = (remindDaysBefore: unknown) => validateCardFields({ remindDaysBefore });
  expect(remind(undefined)).toMatchObject({ ok: true, value: { remindDaysBefore: 14 } });
  expect(remind(30)).toMatchObject({ ok: true, value: { remindDaysBefore: 30 } });
  expect(remind(' 7 ')).toMatchObject({ ok: true, value: { remindDaysBefore: 7 } });
  expect(remind(365)).toMatchObject({ ok: true });
  for (const bad of ['', '0', 0, 366, 1.5, '-3', 'ten', null]) {
    expect(remind(bad)).toEqual({ ok: false, errors: ['bad-reminder'] });
  }
});

test('only true makes a card vertical', () => {
  const base = { name: 'Gym' };
  expect(validateCardFields({ ...base, vertical: true })).toMatchObject({ ok: true, value: { vertical: true } });
  for (const v of [false, 'true', 1, undefined]) {
    expect(validateCardFields({ ...base, vertical: v })).toMatchObject({ ok: true, value: { vertical: false } });
  }
});

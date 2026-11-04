import { validateCardFields } from '../validate';

test('accepts a minimal card and normalises blanks', () => {
  expect(validateCardFields({ name: '  Gym  ', category: 'membership', expiresOn: '' })).toEqual({
    ok: true,
    value: { name: 'Gym', category: 'membership', expiresOn: null, remindDaysBefore: 14, tags: [], documentKey: null, folderId: null, readText: null },
  });
});

test('the name is optional', () => {
  expect(validateCardFields({ name: '   ', category: 'id' })).toEqual({
    ok: true,
    value: { name: '', category: 'id', expiresOn: null, remindDaysBefore: 14, tags: [], documentKey: null, folderId: null, readText: null },
  });
  expect(validateCardFields({ category: 'id' }).ok).toBe(true);
});

test('keeps a trimmed expiry date', () => {
  expect(validateCardFields({ name: 'Emirates ID', category: 'id', expiresOn: ' 2027-03-01 ' })).toEqual({
    ok: true,
    value: { name: 'Emirates ID', category: 'id', expiresOn: '2027-03-01', remindDaysBefore: 14, tags: [], documentKey: null, folderId: null, readText: null },
  });
});

test('reports every problem at once', () => {
  expect(validateCardFields({ name: 'x'.repeat(61), category: 'x'.repeat(25), expiresOn: '2027-02-30' })).toEqual({
    ok: false,
    errors: ['name-too-long', 'bad-category', 'bad-expiry'],
  });
});

test('name longer than 60 characters is rejected', () => {
  expect(validateCardFields({ name: 'x'.repeat(61), category: 'other' })).toEqual({ ok: false, errors: ['name-too-long'] });
  expect(validateCardFields({ name: 'x'.repeat(60), category: 'other' }).ok).toBe(true);
});

test('cards saved as Loyalty become Other', () => {
  expect(validateCardFields({ name: 'Coffee', category: 'loyalty' })).toEqual({
    ok: true,
    value: { name: 'Coffee', category: 'other', expiresOn: null, remindDaysBefore: 14, tags: [], documentKey: null, folderId: null, readText: null },
  });
});

test('non-string input (e.g. from a tampered backup) is handled', () => {
  expect(validateCardFields({ name: 42, category: null })).toEqual({ ok: false, errors: ['bad-category'] });
  expect(validateCardFields({ name: 'Gym', category: '   ' })).toEqual({ ok: false, errors: ['bad-category'] });
});

describe('tags', () => {
  const base = { name: 'Gym', category: 'membership' };

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

test('a typed category is kept, tidied; a built-in key stays a key', () => {
  expect(validateCardFields({ category: '  Vehicle   papers ' })).toMatchObject({ ok: true, value: { category: 'Vehicle papers' } });
  expect(validateCardFields({ category: 'insurance' })).toMatchObject({ ok: true, value: { category: 'insurance' } });
  expect(validateCardFields({ category: 'loyalty' })).toMatchObject({ ok: true, value: { category: 'other' } });
});

test('reminder days: a whole number from 1 to 365, typed or stored; missing means 14', () => {
  const remind = (remindDaysBefore: unknown) => validateCardFields({ category: 'id', remindDaysBefore });
  expect(remind(undefined)).toMatchObject({ ok: true, value: { remindDaysBefore: 14 } });
  expect(remind(30)).toMatchObject({ ok: true, value: { remindDaysBefore: 30 } });
  expect(remind(' 7 ')).toMatchObject({ ok: true, value: { remindDaysBefore: 7 } });
  expect(remind(365)).toMatchObject({ ok: true });
  for (const bad of ['', '0', 0, 366, 1.5, '-3', 'ten', null]) {
    expect(remind(bad)).toEqual({ ok: false, errors: ['bad-reminder'] });
  }
});

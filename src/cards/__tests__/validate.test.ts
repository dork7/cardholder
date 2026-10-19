import { validateCardFields } from '../validate';

test('accepts a minimal card and normalises blanks to null', () => {
  expect(validateCardFields({ name: '  Gym  ', category: 'membership', number: ' ', notes: '', expiresOn: '' })).toEqual({
    ok: true,
    value: { name: 'Gym', category: 'membership', number: null, notes: null, expiresOn: null },
  });
});

test('keeps trimmed optional fields', () => {
  const result = validateCardFields({
    name: 'Emirates ID',
    category: 'id',
    number: ' 784-1990-1234567-1 ',
    notes: 'Renew at ICP',
    expiresOn: '2027-03-01',
  });
  expect(result).toEqual({
    ok: true,
    value: { name: 'Emirates ID', category: 'id', number: '784-1990-1234567-1', notes: 'Renew at ICP', expiresOn: '2027-03-01' },
  });
});

test('reports every problem at once', () => {
  expect(validateCardFields({ name: '   ', category: 'passport', expiresOn: '2027-02-30' })).toEqual({
    ok: false,
    errors: ['name-required', 'bad-category', 'bad-expiry'],
  });
});

test('name longer than 60 characters is rejected', () => {
  expect(validateCardFields({ name: 'x'.repeat(61), category: 'other' })).toEqual({ ok: false, errors: ['name-too-long'] });
  expect(validateCardFields({ name: 'x'.repeat(60), category: 'other' }).ok).toBe(true);
});

test('non-string input (e.g. from a tampered backup) is handled', () => {
  expect(validateCardFields({ name: 42, category: null, number: 7 })).toEqual({
    ok: false,
    errors: ['name-required', 'bad-category'],
  });
});

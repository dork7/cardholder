import { validateNewPassphrase } from '../passphrase';

test('passphrase rules', () => {
  expect(validateNewPassphrase('ab', 'ab')).toBe('too-short');
  expect(validateNewPassphrase('123', '123')).toBeNull(); // numbers only is fine
  expect(validateNewPassphrase('long enough', 'long enoug')).toBe('mismatch');
  expect(validateNewPassphrase('long enough', 'long enough')).toBeNull();
  expect(validateNewPassphrase('🔑🔑🔑', '🔑🔑🔑')).toBeNull(); // 3 characters, 6 UTF-16 units
  expect(validateNewPassphrase('🔑🔑', '🔑🔑')).toBe('too-short'); // 2 characters, though 4 UTF-16 units
});

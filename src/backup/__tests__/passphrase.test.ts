import { validateNewPassphrase } from '../passphrase';

test('passphrase rules', () => {
  expect(validateNewPassphrase('short', 'short')).toBe('too-short');
  expect(validateNewPassphrase('long enough', 'long enoug')).toBe('mismatch');
  expect(validateNewPassphrase('long enough', 'long enough')).toBeNull();
  expect(validateNewPassphrase('🔑🔑🔑🔑🔑🔑🔑🔑', '🔑🔑🔑🔑🔑🔑🔑🔑')).toBeNull(); // 8 characters, 16 UTF-16 units
});

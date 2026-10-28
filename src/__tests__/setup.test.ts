import QuickCrypto from 'react-native-quick-crypto';
import { FREE_CARD_LIMIT, PBKDF2_ITERATIONS } from '../config';
import { strings } from '../strings';

test('jest maps react-native-quick-crypto to Node crypto', () => {
  const bytes = (QuickCrypto as unknown as { randomBytes(n: number): Uint8Array }).randomBytes(4);
  expect(bytes).toHaveLength(4);
});

test('constants and strings load', () => {
  expect(FREE_CARD_LIMIT).toBe(4);
  expect(PBKDF2_ITERATIONS).toBe(600_000);
  expect(strings.appName).toBe('Doc Keeper');
});

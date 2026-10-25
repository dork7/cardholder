import * as LocalAuthentication from 'expo-local-authentication';
import { authenticate, deviceLockAvailable } from '../deviceAuth';

jest.mock('expo-local-authentication', () => ({
  SecurityLevel: { NONE: 0, SECRET: 1, BIOMETRIC_WEAK: 2, BIOMETRIC_STRONG: 3 },
  getEnrolledLevelAsync: jest.fn(async () => 3),
  authenticateAsync: jest.fn(async () => ({ success: true })),
}));
const mocked = LocalAuthentication as jest.Mocked<typeof LocalAuthentication>;

beforeEach(() => jest.clearAllMocks());

test('asks the phone, with its passcode always allowed as the fallback', async () => {
  expect(await authenticate('Unlock CardHolder', 'Cancel')).toBe('success');
  expect(mocked.authenticateAsync).toHaveBeenCalledWith({
    promptMessage: 'Unlock CardHolder',
    cancelLabel: 'Cancel',
    disableDeviceFallback: false,
    biometricsSecurityLevel: 'weak',
  });
});

test('a cancelled or failed try is a failure', async () => {
  mocked.authenticateAsync.mockResolvedValueOnce({ success: false, error: 'user_cancel' });
  expect(await authenticate('x', 'y')).toBe('failed');
});

test('"not enrolled" only counts as no lock when the phone really has none', async () => {
  mocked.authenticateAsync.mockResolvedValue({ success: false, error: 'not_enrolled' });
  mocked.getEnrolledLevelAsync.mockResolvedValueOnce(1); // a passcode is set
  expect(await authenticate('x', 'y')).toBe('failed');
  mocked.getEnrolledLevelAsync.mockResolvedValueOnce(0);
  expect(await authenticate('x', 'y')).toBe('no-device-lock');
});

test('any passcode, face or fingerprint counts as a device lock', async () => {
  mocked.getEnrolledLevelAsync.mockResolvedValueOnce(1);
  expect(await deviceLockAvailable()).toBe(true);
  mocked.getEnrolledLevelAsync.mockResolvedValueOnce(0);
  expect(await deviceLockAvailable()).toBe(false);
});

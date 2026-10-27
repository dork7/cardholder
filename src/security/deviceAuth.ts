import * as LocalAuthentication from 'expo-local-authentication';

// The phone's own lock: Face ID, Touch ID or fingerprint, falling back to the device passcode, PIN,
// pattern or password. Doc Keeper never sees or stores any of it.

export async function deviceLockAvailable(): Promise<boolean> {
  return (await LocalAuthentication.getEnrolledLevelAsync()) !== LocalAuthentication.SecurityLevel.NONE;
}

// Errors that mean the phone has no lock to ask for (rather than a failed or cancelled try).
const NO_LOCK: readonly string[] = ['not_enrolled', 'passcode_not_set', 'not_available'];

export type AuthResult = 'success' | 'failed' | 'no-device-lock';

export async function authenticate(promptMessage: string, cancelLabel: string): Promise<AuthResult> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel,
    disableDeviceFallback: false, // the passcode is always an option, as on the lock screen
    biometricsSecurityLevel: 'weak', // Android: face unlock counts, as it does for the phone itself
  });
  if (result.success) return 'success';
  if (NO_LOCK.includes(result.error) && !(await deviceLockAvailable())) return 'no-device-lock';
  return 'failed';
}

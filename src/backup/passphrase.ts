import { MIN_PASSPHRASE_LENGTH } from '../config';

export type PassphraseProblem = 'too-short' | 'mismatch';

export function validateNewPassphrase(passphrase: string, confirmation: string): PassphraseProblem | null {
  if ([...passphrase].length < MIN_PASSPHRASE_LENGTH) return 'too-short';
  if (passphrase !== confirmation) return 'mismatch';
  return null;
}

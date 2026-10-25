import { LOCK_AFTER_BACKGROUND_MS } from '../config';
import { Settings } from '../storage/settings';

export async function loadAppLock(settings: Settings): Promise<boolean> {
  return (await settings.get('appLock')) === '1';
}

export async function saveAppLock(settings: Settings, on: boolean): Promise<void> {
  await settings.set('appLock', on ? '1' : '0');
}

// A quick trip out (copying a number, a photo picker, a share sheet) doesn't lock; a longer one does.
export function lockOnReturn(backgroundedAt: number | null, now: number): boolean {
  return backgroundedAt !== null && now - backgroundedAt >= LOCK_AFTER_BACKGROUND_MS;
}

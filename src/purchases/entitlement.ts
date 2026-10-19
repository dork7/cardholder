import { Settings } from '../storage/settings';

export async function isUnlocked(settings: Settings): Promise<boolean> {
  return (await settings.get('unlocked')) === '1';
}

export async function markUnlocked(settings: Settings): Promise<void> {
  await settings.set('unlocked', '1');
}

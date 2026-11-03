import { Settings } from '../storage/settings';

// Whether the counter view turns the screen all the way up. On until turned off: only a stored '0'
// leaves the brightness alone.
export async function loadCardBrightness(settings: Settings): Promise<boolean> {
  return (await settings.get('cardBrightness')) !== '0';
}

export async function saveCardBrightness(settings: Settings, on: boolean): Promise<void> {
  await settings.set('cardBrightness', on ? '1' : '0');
}

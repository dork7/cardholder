import { Appearance } from 'react-native';
import { Settings } from '../storage/settings';

// System follows the phone; Light and Dark are the manual override next to it.
export const APPEARANCES = ['system', 'light', 'dark'] as const;
export type AppearancePref = (typeof APPEARANCES)[number];

export function nextAppearance(pref: AppearancePref): AppearancePref {
  return APPEARANCES[(APPEARANCES.indexOf(pref) + 1) % APPEARANCES.length];
}

// An app-level override: useColorScheme(), native alerts and pickers all follow it.
export function applyAppearance(pref: AppearancePref): void {
  Appearance.setColorScheme(pref === 'system' ? 'auto' : pref);
}

export async function loadAppearance(settings: Settings): Promise<AppearancePref> {
  const stored = await settings.get('appearance');
  return APPEARANCES.find((a) => a === stored) ?? 'system';
}

export async function saveAppearance(settings: Settings, pref: AppearancePref): Promise<void> {
  await settings.set('appearance', pref);
}

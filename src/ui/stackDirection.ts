import { Settings } from '../storage/settings';

// Whether the home stack swipes up and down instead of sideways. Off until turned on: only a stored
// '1' makes it vertical.
export async function loadStackVertical(settings: Settings): Promise<boolean> {
  return (await settings.get('stackVertical')) === '1';
}

export async function saveStackVertical(settings: Settings, on: boolean): Promise<void> {
  await settings.set('stackVertical', on ? '1' : '0');
}

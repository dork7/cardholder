import { Appearance } from 'react-native';
import { applyAppearance, loadAppearance, nextAppearance, saveAppearance } from '../appearance';
import { Settings } from '../../storage/settings';

function memorySettings(initial: Record<string, string> = {}): Settings {
  const values = new Map(Object.entries(initial));
  return {
    get: async (key) => values.get(key) ?? null,
    getNumber: async () => null,
    set: async (key, value) => void values.set(key, value),
    remove: async (key) => void values.delete(key),
  };
}

test('cycles System, Light, Dark and back', () => {
  expect(nextAppearance('system')).toBe('light');
  expect(nextAppearance('light')).toBe('dark');
  expect(nextAppearance('dark')).toBe('system');
});

test('System removes the override; Light and Dark set it', () => {
  const set = jest.spyOn(Appearance, 'setColorScheme').mockImplementation(() => {});
  applyAppearance('system');
  applyAppearance('dark');
  expect(set.mock.calls).toEqual([['auto'], ['dark']]);
  set.mockRestore();
});

test('the choice is remembered, and anything unknown falls back to System', async () => {
  const settings = memorySettings();
  expect(await loadAppearance(settings)).toBe('system');
  await saveAppearance(settings, 'dark');
  expect(await loadAppearance(settings)).toBe('dark');
  expect(await loadAppearance(memorySettings({ appearance: 'sepia' }))).toBe('system');
});

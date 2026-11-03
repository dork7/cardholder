import { renderHook } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { useMaxBrightness } from '../useMaxBrightness';

const mockSet = jest.fn((_: number) => Promise.resolve());
const mockRestoreSystem = jest.fn(() => Promise.resolve());
jest.mock('expo-brightness', () => ({
  getBrightnessAsync: () => Promise.resolve(0.4),
  setBrightnessAsync: (v: number) => mockSet(v),
  restoreSystemBrightnessAsync: () => mockRestoreSystem(),
}));

const flush = () => new Promise((r) => setImmediate(r));
const originalOS = Platform.OS;
afterEach(() => {
  Platform.OS = originalOS;
  jest.clearAllMocks();
});

test('on iOS, turns the screen all the way up and puts the old level back on the way out', async () => {
  Platform.OS = 'ios';
  const { unmount } = await renderHook(() => useMaxBrightness(true));
  await flush();
  expect(mockSet).toHaveBeenLastCalledWith(1);
  await unmount();
  expect(mockSet).toHaveBeenLastCalledWith(0.4);
});

test('on Android, hands the brightness back to the system on the way out', async () => {
  Platform.OS = 'android';
  const { unmount } = await renderHook(() => useMaxBrightness(true));
  await flush();
  expect(mockSet).toHaveBeenLastCalledWith(1);
  await unmount();
  expect(mockRestoreSystem).toHaveBeenCalled();
});

test('turned off, leaves the brightness alone', async () => {
  const { unmount } = await renderHook(() => useMaxBrightness(false));
  await flush();
  await unmount();
  expect(mockSet).not.toHaveBeenCalled();
  expect(mockRestoreSystem).not.toHaveBeenCalled();
});

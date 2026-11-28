import { Platform } from 'react-native';
import { requireNativeModule } from 'expo';
import { pickContact } from '../contactPicker';

jest.mock('expo', () => ({ requireNativeModule: jest.fn() }));

test('system picker copies only the chosen name and phone without requesting contacts permission', async () => {
  const originalPlatform = Platform.OS;
  Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
  const nativePick = jest.fn().mockResolvedValue({ name: 'Omar', phone: '+971500000001' });
  (requireNativeModule as jest.Mock).mockReturnValue({ pickContact: nativePick });
  try {
    await expect(pickContact()).resolves.toEqual({ name: 'Omar', phone: '+971500000001' });
    expect(requireNativeModule).toHaveBeenCalledWith('ProfileContactPicker');
    expect(nativePick).toHaveBeenCalledTimes(1);
  } finally {
    Object.defineProperty(Platform, 'OS', { value: originalPlatform, configurable: true });
  }
});

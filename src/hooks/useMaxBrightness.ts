import { useEffect } from 'react';
import * as Brightness from 'expo-brightness';
import { Platform } from 'react-native';

// Turns the screen all the way up while mounted, and gives it back on the way out. Off leaves the
// brightness alone (the Settings switch).
export function useMaxBrightness(enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    let previousBrightness = 0.5;

    const setBrightness = async () => {
      try {
        if (Platform.OS === 'ios') {
          previousBrightness = await Brightness.getBrightnessAsync();
        }
        await Brightness.setBrightnessAsync(1.0);
      } catch (e) {
        console.warn('Failed to set brightness', e);
      }
    };

    setBrightness();

    return () => {
      // iOS changes the whole phone's brightness, so the old level is put back. Android only
      // overrides this app's window, so handing it back to the system setting is enough.
      const restore =
        Platform.OS === 'ios'
          ? Brightness.setBrightnessAsync(previousBrightness)
          : Brightness.restoreSystemBrightnessAsync();
      restore.catch((e) => console.warn('Failed to restore brightness', e));
    };
  }, [enabled]);
}

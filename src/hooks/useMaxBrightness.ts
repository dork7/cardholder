import { useEffect } from 'react';
import * as Brightness from 'expo-brightness';
import { Platform } from 'react-native';

export function useMaxBrightness() {
  useEffect(() => {
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
      if (Platform.OS === 'ios') {
        Brightness.setBrightnessAsync(previousBrightness).catch((e) =>
          console.warn('Failed to restore brightness', e),
        );
      }
    };
  }, []);
}

import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect } from 'react';

// The app is portrait, except where turning the phone helps: the card view shows both sides side by
// side in landscape. Portrait is locked again on the way out.
export function useAllowLandscape(): void {
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.DEFAULT).catch(() => {});
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, []);
}

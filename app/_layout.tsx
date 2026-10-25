import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import { ReactNode, useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppProvider, useApp, useBoot } from '../src/app/AppProvider';
import { AppLockGate } from '../src/security/AppLockGate';
import { BootScreen } from '../src/app/BootScreen';
import { setupNotifications } from '../src/reminders/scheduler';
import { strings } from '../src/strings';
import { FONTS } from '../src/ui/fonts';
import { useTheme } from '../src/ui/theme';

export default function RootLayout() {
  const [fontsLoaded] = useFonts(FONTS);
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    setupNotifications().catch((e) => console.warn('Notification setup failed', e));
  }, []);

  // Fonts are bundled, so this resolves in milliseconds; the native splash screen covers it.
  if (!fontsLoaded) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProvider>
        <RootNavigator />
      </AppProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { phase } = useBoot();
  const theme = useTheme();
  if (phase.status !== 'ready') return <BootScreen />;
  return (
    <LockedApp>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.surface },
          headerTintColor: theme.text,
          contentStyle: { backgroundColor: theme.bg },
        }}
      >
         <Stack.Screen name="index" options={{ title: strings.home.title, headerShown: false }} />
         <Stack.Screen name="edit/[id]" options={{ presentation: 'modal' }} />
         <Stack.Screen name="card/[id]" options={{ presentation: 'transparentModal', headerShown: false }} />
         <Stack.Screen name="settings" options={{ title: strings.settings.title }} />
         <Stack.Screen name="folders" options={{ title: strings.folders.title }} />
         <Stack.Screen name="export" options={{ title: strings.export.title, presentation: 'modal' }} />
         <Stack.Screen name="import" options={{ title: strings.import.title, presentation: 'modal' }} />
         <Stack.Screen name="privacy" options={{ title: strings.privacy.title }} />
         <Stack.Screen name="send/[id]" options={{ presentation: 'fullScreenModal', headerShown: false }} />
         <Stack.Screen name="receive" options={{ title: strings.transfer.receiveTitle, presentation: 'modal' }} />
       </Stack>
    </LockedApp>
  );
}

// useApp is only available once boot is ready, so the gate reads it here rather than in RootNavigator.
function LockedApp({ children }: { children: ReactNode }) {
  const { appLock } = useApp();
  return <AppLockGate enabled={appLock}>{children}</AppLockGate>;
}

import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import { ReactNode, useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppProvider, useApp, useBoot } from '../src/app/AppProvider';
import { removeModelFiles } from '../src/app/removeModelFiles';
import { AppLockGate } from '../src/security/AppLockGate';
import { ShareInReceiver } from '../src/share/ShareInReceiver';
import { BootScreen } from '../src/app/BootScreen';
import { CrashPrompt } from '../src/diagnostics/CrashPrompt';
import { ErrorBoundary } from '../src/diagnostics/ErrorBoundary';
import { installDiagnostics } from '../src/diagnostics/install';
import { setupNotifications } from '../src/reminders/scheduler';
import { strings } from '../src/strings';
import { FONTS } from '../src/ui/fonts';
import { useTheme } from '../src/ui/theme';

// Before the first render, so a crash anywhere after this is recorded (src/diagnostics/).
installDiagnostics();

export default function RootLayout() {
  const [fontsLoaded] = useFonts(FONTS);
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    setupNotifications().catch((e) => console.warn('Notification setup failed', e));
    removeModelFiles();
  }, []);

  // Fonts are bundled, so this resolves in milliseconds; the native splash screen covers it.
  if (!fontsLoaded) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <AppProvider>
          <RootNavigator />
        </AppProvider>
      </ErrorBoundary>
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
      <CrashPrompt />
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
         <Stack.Screen name="paywall" options={{ title: strings.paywall.title, presentation: 'modal' }} />
         <Stack.Screen name="folders" options={{ title: strings.folders.title }} />
         <Stack.Screen name="tags" options={{ title: strings.tagsScreen.title }} />
         <Stack.Screen name="export" options={{ title: strings.export.title, presentation: 'modal' }} />
         <Stack.Screen name="import" options={{ title: strings.import.title, presentation: 'modal' }} />
         <Stack.Screen name="privacy" options={{ title: strings.privacy.title }} />
       </Stack>
    </LockedApp>
  );
}

// useApp is only available once boot is ready, so the gate reads it here rather than in RootNavigator.
function LockedApp({ children }: { children: ReactNode }) {
  const { appLock } = useApp();
  return (
    <AppLockGate enabled={appLock}>
      {children}
      <ShareInReceiver />
    </AppLockGate>
  );
}

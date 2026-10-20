import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppProvider, useBoot } from '../src/app/AppProvider';
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
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.surface },
          headerTintColor: theme.text,
          contentStyle: { backgroundColor: theme.bg },
        }}
      >
        <Stack.Screen name="index" options={{ title: strings.home.title }} />
      </Stack>
    </>
  );
}

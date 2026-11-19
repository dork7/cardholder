import { useEffect, useState } from 'react';
import { AppState, NativeEventSubscription, Platform, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { strings } from '../strings';
import { Rosette } from './Rosette';
import { TYPE, useTheme } from './theme';

const ANDROID_RECENTS_API = 33; // setRecentsScreenshotEnabled, applied by plugins/withRecentsScreenshotDisabled.js

// iOS snapshots the app for the switcher after it goes `inactive`, so this cover is what gets captured.
// Android 13+ blanks the recents card natively; on 10–12 covering on window blur is the best we can do
// without FLAG_SECURE, which would also block screenshots.
export function PrivacyShield() {
  const theme = useTheme();
  const [covered, setCovered] = useState(false);

  useEffect(() => {
    const subscriptions: NativeEventSubscription[] = [
      AppState.addEventListener('change', (state) => setCovered(state !== 'active')),
    ];
    // Not on 13+: blur also fires for the app's own dialogs and share sheet.
    if (Platform.OS === 'android' && (Platform.Version as number) < ANDROID_RECENTS_API) {
      subscriptions.push(
        AppState.addEventListener('blur', () => setCovered(true)),
        AppState.addEventListener('focus', () => setCovered(false)),
      );
    }
    return () => subscriptions.forEach((s) => s.remove());
  }, []);

  if (!covered) return null;
  return (
    <View
      testID="privacy-shield"
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.cover, { backgroundColor: theme.bg }]}
    >
      <Rosette size={180} color={theme.rosette} />
      <Text style={[styles.name, { color: theme.text }]}>{strings.shield}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { alignItems: 'center', justifyContent: 'center', zIndex: 1000, elevation: 1000 },
  name: { fontSize: TYPE.display, fontWeight: '700' },
});

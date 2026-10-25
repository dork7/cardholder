import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { strings } from '../strings';
import { Button } from '../ui/Button';
import { Rosette } from '../ui/Rosette';
import { Text } from '../ui/Text';
import { TYPE, useTheme } from '../ui/theme';
import { lockOnReturn } from './appLock';
import { authenticate } from './deviceAuth';

interface Props {
  enabled: boolean;
  children: ReactNode;
}

// With the app lock on, the app opens locked and locks again after a while in the background. The
// screens stay mounted underneath (so a reminder or shortcut that opened a card is still there after
// unlocking) but are covered, and hidden from screen readers, until the phone's own lock says yes.
export function AppLockGate({ enabled, children }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  // Decided once at mount: turning the lock on in Settings doesn't lock the screen you're on.
  const [locked, setLocked] = useState(enabled);
  const backgroundedAt = useRef<number | null>(null);
  // The prompt itself can send the app to the background (Android's PIN screen is its own activity);
  // that must not count as leaving.
  const authenticating = useRef(false);
  const prompted = useRef(false);

  const unlock = useCallback(async () => {
    if (authenticating.current) return;
    authenticating.current = true;
    try {
      const result = await authenticate(strings.lock.prompt, strings.common.cancel);
      // No lock on the phone any more: there is nothing to ask for, so don't shut the owner out.
      if (result !== 'failed') setLocked(false);
    } catch (e) {
      console.warn('Unlock failed', e);
    } finally {
      authenticating.current = false;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLocked(false);
      return;
    }
    const sub = AppState.addEventListener('change', (state) => {
      if (authenticating.current) return;
      if (state === 'background') {
        backgroundedAt.current = Date.now();
      } else if (state === 'active') {
        if (lockOnReturn(backgroundedAt.current, Date.now())) {
          prompted.current = false;
          setLocked(true);
        }
        backgroundedAt.current = null;
      }
    });
    return () => sub.remove();
  }, [enabled]);

  // Ask straight away each time the lock comes up; after a cancel, the Unlock button asks again.
  useEffect(() => {
    if (!locked || prompted.current) return;
    prompted.current = true;
    void unlock();
  }, [locked, unlock]);

  const showLock = enabled && locked;
  const cover = showLock && (
    <View
      style={[styles.cover, { backgroundColor: theme.bg, paddingBottom: insets.bottom + 24 }]}
      accessibilityViewIsModal
      testID="app-lock"
    >
      <View style={styles.centre}>
        <Rosette size={160} color={theme.rosette} />
        <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
          {strings.lock.title}
        </Text>
        <Text style={[styles.body, { color: theme.muted }]}>{strings.lock.body}</Text>
      </View>
      <View style={styles.action}>
        <Button label={strings.lock.unlock} onPress={() => void unlock()} testID="unlock" />
      </View>
    </View>
  );

  return (
    <View style={styles.fill}>
      <View
        style={styles.fill}
        accessibilityElementsHidden={showLock}
        importantForAccessibility={showLock ? 'no-hide-descendants' : 'auto'}
      >
        {children}
      </View>
      {/* On iOS the edit, card and backup screens are native modals above this view; only a
          full-window overlay draws over them. On Android they live in this view, so a plain cover does. */}
      {cover && (Platform.OS === 'ios' ? <FullWindowOverlay unstable_accessibilityContainerViewIsModal>{cover}</FullWindowOverlay> : cover)}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  cover: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'space-between', paddingHorizontal: 16 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  title: { fontSize: TYPE.title, fontWeight: '700', textAlign: 'center' },
  body: { fontSize: TYPE.body, textAlign: 'center' },
  action: { paddingHorizontal: 16 },
});

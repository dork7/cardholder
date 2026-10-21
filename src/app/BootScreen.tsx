import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet } from 'react-native';
import { Text } from '../ui/Text';
import { strings } from '../strings';
import { Button } from '../ui/Button';
import { Panel, Screen } from '../ui/Surface';
import { useTheme } from '../ui/theme';
import { useBoot } from './AppProvider';

export function BootScreen() {
  const { phase, startFresh, retry } = useBoot();
  const theme = useTheme();
  const [busy, setBusy] = useState(false);

  // Both choices wipe the locked cards, so both confirm first.
  const confirm = (thenImport: boolean) =>
    Alert.alert(strings.boot.startFreshConfirmTitle, strings.boot.startFreshConfirmBody, [
      { text: strings.common.cancel, style: 'cancel' },
      {
        text: thenImport ? strings.boot.importBackup : strings.boot.startFresh,
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await startFresh(thenImport);
          } catch {
            setBusy(false);
            Alert.alert(strings.common.error);
          }
        },
      },
    ]);

  // Scrolls so the actions stay reachable at the largest system font sizes; the container grows to
  // the screen height and centres short content vertically. Text and buttons are left-aligned.
  return (
    <Screen>
      <ScrollView testID="boot-scroll" contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
        <Panel style={styles.panel}>
          {phase.status === 'loading' && (
            <>
              <ActivityIndicator color={theme.accent} style={styles.spinner} />
              <Text style={[styles.body, { color: theme.muted }]}>{strings.boot.loading}</Text>
            </>
          )}
          {phase.status === 'error' && (
            <>
              <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
                {strings.boot.errorTitle}
              </Text>
              <Text style={[styles.body, { color: theme.muted }]}>{strings.boot.errorBody}</Text>
              <Button label={strings.boot.retry} onPress={() => void retry()} />
            </>
          )}
          {phase.status === 'orphaned' && (
            <>
              <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
                {strings.boot.orphanedTitle}
              </Text>
              <Text style={[styles.body, { color: theme.muted }]}>{strings.boot.orphanedBody}</Text>
              <Button label={strings.boot.importBackup} onPress={() => confirm(true)} disabled={busy} />
              <Button variant="secondary" label={strings.boot.startFresh} onPress={() => confirm(false)} disabled={busy} />
            </>
          )}
        </Panel>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center', padding: 16 },
  panel: { padding: 24, gap: 16 },
  spinner: { alignSelf: 'flex-start' },
  title: { fontSize: 24, fontWeight: '700' },
  body: { fontSize: 18 },
});

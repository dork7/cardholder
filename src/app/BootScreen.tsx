import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { Text } from '../ui/Text';
import { strings } from '../strings';
import { Button } from '../ui/Button';
import { useTheme } from '../ui/theme';
import { useBoot } from './AppProvider';

export function BootScreen() {
  const { phase, startFresh } = useBoot();
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

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      {phase.status === 'loading' && (
        <>
          <ActivityIndicator color={theme.accent} />
          <Text style={[styles.body, { color: theme.muted }]}>{strings.boot.loading}</Text>
        </>
      )}
      {phase.status === 'error' && (
        <>
          <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
            {strings.boot.errorTitle}
          </Text>
          <Text style={[styles.body, { color: theme.muted }]}>{phase.message}</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', padding: 24, gap: 16 },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  body: { fontSize: 18, textAlign: 'center' },
});

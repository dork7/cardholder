import { useRouter } from 'expo-router';
import { ComponentRef, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useApp } from '../src/app/AppProvider';
import { encodeBackup } from '../src/backup/backupFile';
import { buildSnapshot } from '../src/backup/backupService';
import { recordExport } from '../src/backup/lastExport';
import { validateNewPassphrase } from '../src/backup/passphrase';
import { MIN_PASSPHRASE_LENGTH } from '../src/config';
import { shareBackupFile } from '../src/share/shareCard';
import { strings } from '../src/strings';
import { Button } from '../src/ui/Button';
import { Field, useInputStyle } from '../src/ui/Field';
import { Panel, Screen } from '../src/ui/Surface';
import { Text } from '../src/ui/Text';
import { TYPE, useTheme } from '../src/ui/theme';

export default function ExportScreen() {
  const { services } = useApp();
  const router = useRouter();
  const theme = useTheme();
  const inputStyle = useInputStyle();
  const [passphrase, setPassphrase] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const running = useRef(false); // synchronous guard against a double tap starting two exports
  const confirmRef = useRef<ComponentRef<typeof TextInput>>(null);

  const run = async () => {
    if (running.current) return;
    const problem = validateNewPassphrase(passphrase, confirmation);
    if (problem) {
      setError(problem === 'too-short' ? strings.export.tooShort(MIN_PASSPHRASE_LENGTH) : strings.export.mismatch);
      return;
    }
    running.current = true;
    setError(null);
    setBusy(true);
    try {
      const now = Date.now();
      const bytes = await encodeBackup(await buildSnapshot(services.store, now), passphrase);
      await shareBackupFile(bytes, new Date(now));
      // The share sheet doesn't report whether the file was saved, so closing it counts as an export.
      await recordExport(services.settings, now);
      Alert.alert(strings.export.done);
      router.back();
    } catch (e) {
      console.warn('Export failed', e);
      Alert.alert(strings.export.failed);
    } finally {
      running.current = false;
      setBusy(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Panel style={styles.group}>
            <Text style={[styles.body, { color: theme.text }]}>{strings.export.intro}</Text>
            <Text style={[styles.body, styles.warning, { color: theme.danger }]}>{strings.export.warning}</Text>
          </Panel>
          <Panel style={styles.group}>
            <Field label={strings.export.passphrase}>
              <TextInput
                value={passphrase}
                onChangeText={setPassphrase}
                onSubmitEditing={() => confirmRef.current?.focus()}
                returnKeyType="next"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="none"
                accessibilityLabel={strings.export.passphrase}
                style={inputStyle}
                testID="export-passphrase"
              />
            </Field>
            <Field label={strings.export.confirm} error={error ?? undefined}>
              <TextInput
                ref={confirmRef}
                value={confirmation}
                onChangeText={setConfirmation}
                onSubmitEditing={run}
                returnKeyType="done"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="none"
                accessibilityLabel={strings.export.confirm}
                style={inputStyle}
                testID="export-confirm"
              />
            </Field>
          </Panel>
          {busy ? (
            <View style={styles.busy} accessibilityLiveRegion="polite">
              <ActivityIndicator color={theme.accent} />
              <Text style={[styles.body, { color: theme.muted }]}>{strings.export.working}</Text>
            </View>
          ) : (
            <Button label={strings.export.action} onPress={run} testID="export-run" />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  group: { padding: 16, gap: 20 },
  body: { fontSize: TYPE.body },
  warning: { fontWeight: '700' },
  busy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: 48 },
});

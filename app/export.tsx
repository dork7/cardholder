import { useRouter } from 'expo-router';
import { ComponentRef, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useApp } from '../src/app/AppProvider';
import { encodeBackup } from '../src/backup/backupFile';
import { buildSnapshot } from '../src/backup/backupService';
import { recordExport } from '../src/backup/lastExport';
import { validateNewPassphrase } from '../src/backup/passphrase';
import { MIN_PASSPHRASE_LENGTH } from '../src/config';
import { saveBackupFile, shareBackupFile } from '../src/share/shareCard';
import { strings } from '../src/strings';
import { Button } from '../src/ui/Button';
import { Field, useInputStyle } from '../src/ui/Field';
import { Panel, Screen } from '../src/ui/Surface';
import { Text } from '../src/ui/Text';
import { TYPE, useTheme } from '../src/ui/theme';
import { LiveText } from '../src/ui/LiveText';
import { KeyboardAvoid } from '../src/ui/KeyboardAvoid';

export default function ExportScreen() {
  const { services } = useApp();
  const router = useRouter();
  const theme = useTheme();
  const inputStyle = useInputStyle();
  const [passphrase, setPassphrase] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [noteCount, setNoteCount] = useState<number | null>(null);
  useEffect(() => {
    services.notes.list().then((notes) => setNoteCount(notes.length)).catch(() => {});
  }, [services]);
  const running = useRef(false); // synchronous guard against a double tap starting two exports
  const confirmRef = useRef<ComponentRef<typeof TextInput>>(null);

  // 'save' writes the file where the user picks and is the only path that counts as a backup: the
  // share sheet ('send') can't say whether the file went anywhere, so it never records an export.
  const run = async (how: 'save' | 'send') => {
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
      await services.noteEditors.flushAll();
      const now = Date.now();
      const bytes = await encodeBackup(await buildSnapshot(services.store, now, services.notes), passphrase);
      if (how === 'send') {
        await shareBackupFile(bytes, new Date(now));
        router.back();
        return;
      }
      const saved = await saveBackupFile(bytes, new Date(now));
      if (saved === null) return; // the folder picker was cancelled: nothing happened
      await recordExport(services.settings, now);
      Alert.alert(strings.export.done(saved));
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
      <KeyboardAvoid>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Panel style={styles.group}>
            <Text style={[styles.body, { color: theme.text }]}>{strings.export.intro}</Text>
            {noteCount !== null && <Text style={[styles.body, { color: theme.text }]}>{strings.notes.backupSummary(noteCount)}</Text>}
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
                onSubmitEditing={() => run('save')}
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
            <View style={styles.busy}>
              <ActivityIndicator color={theme.accent} />
              <LiveText style={[styles.body, { color: theme.muted }]}>{strings.export.working}</LiveText>
            </View>
          ) : (
            <View style={styles.actions}>
              <Button icon="backup" label={strings.export.action} onPress={() => run('save')} testID="export-run" />
              <Button
                variant="secondary"
                label={strings.export.send}
                accessibilityHint={strings.export.sendHint}
                onPress={() => run('send')}
                testID="export-send"
              />
              <Text style={[styles.hint, { color: theme.muted }]}>{strings.export.sendHint}</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoid>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  group: { padding: 16, gap: 20 },
  body: { fontSize: TYPE.body },
  warning: { fontWeight: '700' },
  busy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: 48 },
  actions: { gap: 12 },
  hint: { fontSize: TYPE.secondary, textAlign: 'center' },
});

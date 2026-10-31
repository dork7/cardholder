import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useApp } from '../src/app/AppProvider';
import { BackupError, BackupSnapshot, decodeBackup } from '../src/backup/backupFile';
import { applySnapshot, ImportMode } from '../src/backup/backupService';
import { recordExport } from '../src/backup/lastExport';
import { strings } from '../src/strings';
import { formatDate } from '../src/time/dates';
import { Button } from '../src/ui/Button';
import { Field, useInputStyle } from '../src/ui/Field';
import { Panel, Screen } from '../src/ui/Surface';
import { Text } from '../src/ui/Text';
import { TYPE, useTheme } from '../src/ui/theme';

type Step =
  | { kind: 'pick' }
  | { kind: 'unlock'; fileName: string; bytes: Uint8Array }
  | { kind: 'choose'; snapshot: BackupSnapshot };

export default function ImportScreen() {
  const { services, refresh } = useApp();
  const router = useRouter();
  const theme = useTheme();
  const inputStyle = useInputStyle();
  const [step, setStep] = useState<Step>({ kind: 'pick' });
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pickFile = async () => {
    setError(null);
    let result: DocumentPicker.DocumentPickerResult;
    try {
      // Any type: .cardholder has no registered MIME type, so filtering would hide the backups.
      result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
    } catch {
      setError(strings.import.failed);
      return;
    }
    if (result.canceled) return;
    const asset = result.assets[0];
    const file = new File(asset.uri);
    try {
      setPassphrase('');
      setStep({ kind: 'unlock', fileName: asset.name, bytes: await file.bytes() });
    } catch {
      setError(strings.import.failed);
    } finally {
      try {
        file.delete();
      } catch {
        // The picker's cache copy; the OS clears it eventually.
      }
    }
  };

  const unlock = async () => {
    if (step.kind !== 'unlock' || passphrase.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const snapshot = await decodeBackup(step.bytes, passphrase);
      setPassphrase('');
      setStep({ kind: 'choose', snapshot });
    } catch (e) {
      setError(e instanceof BackupError ? strings.import.errors[e.code] : strings.import.failed);
    } finally {
      setBusy(false);
    }
  };

  const apply = async (mode: ImportMode) => {
    if (step.kind !== 'choose' || busy) return;
    setBusy(true);
    try {
      const result = await applySnapshot(services.store, step.snapshot, mode);
      // A restored phone already has a backup: the file we just imported.
      if ((await services.settings.getNumber('lastExportAt')) === null) {
        await recordExport(services.settings, step.snapshot.exportedAt);
      }
      await refresh();
      Alert.alert(strings.import.done(result.added, result.skipped));
      router.dismissAll();
    } catch (e) {
      console.warn('Import failed', e);
      setBusy(false);
      Alert.alert(strings.import.failed);
    }
  };

  const confirmReplace = () =>
    Alert.alert(strings.import.replaceConfirmTitle, strings.import.replaceConfirmBody, [
      { text: strings.common.cancel, style: 'cancel' },
      { text: strings.import.replace, style: 'destructive', onPress: () => apply('replace') },
    ]);

  const busyRow = (
    <View style={styles.busy} accessibilityLiveRegion="polite">
      <ActivityIndicator color={theme.accent} />
      <Text style={[styles.body, { color: theme.muted }]}>{strings.import.working}</Text>
    </View>
  );

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {step.kind === 'pick' && <Button label={strings.import.pickFile} onPress={pickFile} testID="import-pick" />}

          {step.kind === 'unlock' && (
            <>
              <Panel style={styles.group}>
                <Text style={[styles.body, { color: theme.text }]}>{strings.import.fileChosen(step.fileName)}</Text>
                <Field label={strings.import.passphrase}>
                  <TextInput
                    value={passphrase}
                    onChangeText={setPassphrase}
                    onSubmitEditing={unlock}
                    returnKeyType="done"
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    accessibilityLabel={strings.import.passphrase}
                    style={inputStyle}
                    testID="import-passphrase"
                  />
                </Field>
              </Panel>
              {busy ? (
                busyRow
              ) : (
                <>
                  <Button label={strings.import.unlock} onPress={unlock} disabled={passphrase.length === 0} testID="import-unlock" />
                  <Button variant="secondary" label={strings.import.pickFile} onPress={pickFile} />
                </>
              )}
            </>
          )}

          {step.kind === 'choose' && (
            <>
              <Panel style={styles.group}>
                <Text style={[styles.body, { color: theme.text }]} testID="import-summary">
                  {strings.import.summary(step.snapshot.cards.length, formatDate(step.snapshot.exportedAt))}
                </Text>
              </Panel>
              {busy ? (
                busyRow
              ) : (
                <>
                  <View style={styles.option}>
                    <Button label={strings.import.merge} onPress={() => apply('merge')} accessibilityHint={strings.import.mergeHint} />
                    <Text style={[styles.hint, { color: theme.muted }]}>{strings.import.mergeHint}</Text>
                  </View>
                  <View style={styles.option}>
                    <Button
                      variant="danger"
                      label={strings.import.replace}
                      onPress={confirmReplace}
                      accessibilityHint={strings.import.replaceHint}
                    />
                    <Text style={[styles.hint, { color: theme.muted }]}>{strings.import.replaceHint}</Text>
                  </View>
                </>
              )}
            </>
          )}

          {error && (
            <Text style={[styles.body, { color: theme.danger }]} accessibilityLiveRegion="polite" testID="import-error">
              {error}
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  group: { padding: 16, gap: 20 },
  option: { gap: 8 },
  body: { fontSize: TYPE.body },
  hint: { fontSize: TYPE.secondary, paddingHorizontal: 4 },
  busy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: 48 },
});

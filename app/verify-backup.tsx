import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { BackupError } from '../src/backup/backupFile';
import { VerifiedBackup, verifyBackup } from '../src/backup/backupService';
import { strings } from '../src/strings';
import { formatDate } from '../src/time/dates';
import { Button } from '../src/ui/Button';
import { Field, useInputStyle } from '../src/ui/Field';
import { LiveText } from '../src/ui/LiveText';
import { Panel, Screen } from '../src/ui/Surface';
import { Text } from '../src/ui/Text';
import { TYPE, useTheme } from '../src/ui/theme';

type Step =
  | { kind: 'pick' }
  | { kind: 'unlock'; fileName: string; bytes: Uint8Array }
  | { kind: 'verified'; summary: VerifiedBackup };

export default function VerifyBackupScreen() {
  const theme = useTheme();
  const inputStyle = useInputStyle();
  const [step, setStep] = useState<Step>({ kind: 'pick' });
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pickFile = async () => {
    if (busy) return;
    setError(null);
    let result: DocumentPicker.DocumentPickerResult;
    try {
      result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
    } catch {
      setError(strings.verify.fileFailed);
      return;
    }
    if (result.canceled) return;
    const asset = result.assets[0];
    const file = new File(asset.uri);
    try {
      setPassphrase('');
      setStep({ kind: 'unlock', fileName: asset.name, bytes: await file.bytes() });
    } catch {
      setError(strings.verify.fileFailed);
    } finally {
      try { file.delete(); } catch { /* The OS eventually clears the picker's cache copy. */ }
    }
  };

  const verify = async () => {
    if (step.kind !== 'unlock' || !passphrase || busy) return;
    setBusy(true);
    setError(null);
    try {
      const summary = await verifyBackup(step.bytes, passphrase);
      setStep({ kind: 'verified', summary }); // Releases encrypted bytes; decrypted records were never kept in state.
    } catch (e) {
      setError(e instanceof BackupError ? strings.verify.errors[e.code] : strings.verify.failed);
    } finally {
      setPassphrase('');
      setBusy(false);
    }
  };

  return <Screen>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.body, { color: theme.muted }]}>{strings.verify.intro}</Text>
        {step.kind === 'unlock' && <Panel style={styles.group}>
          <Text style={[styles.body, { color: theme.text }]}>{strings.import.fileChosen(step.fileName)}</Text>
          <Field label={strings.import.passphrase}>
            <TextInput value={passphrase} onChangeText={setPassphrase} onSubmitEditing={verify}
              secureTextEntry autoCapitalize="none" autoCorrect={false} returnKeyType="done"
              accessibilityLabel={strings.import.passphrase} style={inputStyle} testID="verify-passphrase" />
          </Field>
        </Panel>}
        {step.kind === 'verified' && <Panel style={styles.group}>
          <LiveText style={[styles.body, { color: theme.text }]} testID="verify-summary">
            {strings.verify.summary(step.summary.documents, step.summary.notes, formatDate(step.summary.exportedAt))}
          </LiveText>
        </Panel>}
        {busy ? <View style={styles.busy}><ActivityIndicator color={theme.accent} />
          <LiveText style={[styles.body, { color: theme.muted }]}>{strings.verify.working}</LiveText></View> : <>
          {step.kind === 'unlock' && <Button label={strings.verify.action} onPress={verify}
            disabled={!passphrase} testID="verify-run" />}
          <Button icon="import" variant={step.kind === 'pick' ? undefined : 'secondary'}
            label={step.kind === 'pick' ? strings.verify.pickFile : strings.verify.chooseAnother}
            onPress={pickFile} testID="verify-pick" />
        </>}
        {error && <LiveText style={[styles.body, { color: theme.danger }]} testID="verify-error">{error}</LiveText>}
      </ScrollView>
    </KeyboardAvoidingView>
  </Screen>;
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  group: { padding: 16, gap: 16 },
  body: { fontSize: TYPE.body },
  busy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: 48 },
});

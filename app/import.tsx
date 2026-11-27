import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useApp } from '../src/app/AppProvider';
import { BackupError, BackupSnapshot, decodeBackup } from '../src/backup/backupFile';
import { applySnapshot, ImportMode } from '../src/backup/backupService';
import { recordExport } from '../src/backup/lastExport';
import { DriveError, DriveFile } from '../src/backup/drive/driveApi';
import { canRestoreFromDrive, driveRestore } from '../src/backup/drive/driveConnect';
import { strings } from '../src/strings';
import { formatDate } from '../src/time/dates';
import { Button } from '../src/ui/Button';
import { Field, useInputStyle } from '../src/ui/Field';
import { Panel, Screen } from '../src/ui/Surface';
import { Text } from '../src/ui/Text';
import { TYPE, useTheme } from '../src/ui/theme';
import { LiveText } from '../src/ui/LiveText';

type Step =
  | { kind: 'pick' }
  | { kind: 'drive'; files: DriveFile[] | null } // null while the list loads
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
  const [driveAvailable] = useState(() => Platform.OS === 'android' && canRestoreFromDrive());
  const drive = useRef<ReturnType<typeof driveRestore> | null>(null);

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

  // Restore from Google Drive (ADR-0010): the account chooser, then the backups in its folder.
  const openDrive = async () => {
    setError(null);
    setStep({ kind: 'drive', files: null });
    drive.current = driveRestore();
    try {
      setStep({ kind: 'drive', files: await drive.current.listBackups() });
    } catch (e) {
      setStep({ kind: 'pick' });
      if (!(e instanceof DriveError && e.kind === 'cancelled')) setError(strings.driveBackup.restoreFailed);
    }
  };

  const pickDriveFile = async (file: DriveFile) => {
    if (!drive.current || busy) return;
    setBusy(true);
    setError(null);
    try {
      const bytes = await drive.current.download(file.id);
      setPassphrase('');
      setStep({ kind: 'unlock', fileName: driveLabel(file), bytes });
    } catch {
      setError(strings.driveBackup.restoreFailed);
    } finally {
      setBusy(false);
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
      const result = await applySnapshot(services.store, step.snapshot, mode, services.notes);
      // A restored phone already has a backup: the file we just imported.
      if ((await services.settings.getNumber('lastExportAt')) === null) {
        await recordExport(services.settings, step.snapshot.exportedAt);
      }
      await refresh();
      Alert.alert(strings.import.done(result.added, result.skipped, result.notesAdded, result.notesSkipped));
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
    <View style={styles.busy}>
      <ActivityIndicator color={theme.accent} />
      <LiveText style={[styles.body, { color: theme.muted }]}>{strings.import.working}</LiveText>
    </View>
  );

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {step.kind === 'pick' && <Button icon="import" label={strings.import.pickFile} onPress={pickFile} testID="import-pick" />}
          {step.kind === 'pick' && driveAvailable &&
            <Button icon="backup" variant="secondary" label={strings.driveBackup.restore} onPress={openDrive} testID="import-drive" />}

          {step.kind === 'drive' && (
            step.files === null || busy ? (
              <View style={styles.busy}>
                <ActivityIndicator color={theme.accent} />
                <LiveText style={[styles.body, { color: theme.muted }]}>
                  {step.files === null ? strings.driveBackup.restoreLoading : strings.import.working}
                </LiveText>
              </View>
            ) : (
              <>
                {step.files.length === 0 && <Text style={[styles.body, { color: theme.text }]}>{strings.driveBackup.restoreNone}</Text>}
                {step.files.map((file) => (
                  <Button key={file.id} variant="secondary" label={driveLabel(file)} onPress={() => pickDriveFile(file)} testID={`import-drive-${file.id}`} />
                ))}
                <Button icon="import" variant="secondary" label={strings.import.pickFile} onPress={pickFile} />
              </>
            )
          )}

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
                  <Button icon="import" variant="secondary" label={strings.import.pickFile} onPress={pickFile} />
                </>
              )}
            </>
          )}

          {step.kind === 'choose' && (
            <>
              <Panel style={styles.group}>
                <Text style={[styles.body, { color: theme.text }]} testID="import-summary">
                  {strings.import.summary(step.snapshot.cards.length, formatDate(step.snapshot.exportedAt), step.snapshot.notes?.length ?? 0)}
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
            <LiveText style={[styles.body, { color: theme.danger }]} testID="import-error">
              {error}
            </LiveText>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const driveLabel = (file: DriveFile) =>
  strings.driveBackup.restoreItem(formatDate(Date.parse(file.createdTime)), `${Math.max(0.1, file.size / 1_048_576).toFixed(1)} MB`);

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  group: { padding: 16, gap: 20 },
  option: { gap: 8 },
  body: { fontSize: TYPE.body },
  hint: { fontSize: TYPE.secondary, paddingHorizontal: 4 },
  busy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: 48 },
});

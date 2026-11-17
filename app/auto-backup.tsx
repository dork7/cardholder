import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useApp } from '../src/app/AppProvider';
import { AutoBackupConfig, BackupFrequency, loadAutoBackup } from '../src/backup/autoBackup';
import { androidAutoBackup, canAutoBackup, pickBackupFolder } from '../src/backup/androidAutoBackup';
import { validateNewPassphrase } from '../src/backup/passphrase';
import { MIN_PASSPHRASE_LENGTH } from '../src/config';
import { strings } from '../src/strings';
import { Button } from '../src/ui/Button';
import { Field, useInputStyle } from '../src/ui/Field';
import { LiveText } from '../src/ui/LiveText';
import { Panel, Screen } from '../src/ui/Surface';
import { Text } from '../src/ui/Text';
import { TYPE, useTheme } from '../src/ui/theme';

export default function AutoBackupScreen() {
  const { services } = useApp();
  const theme = useTheme();
  const inputStyle = useInputStyle();
  const [config, setConfig] = useState<AutoBackupConfig | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [frequency, setFrequency] = useState<BackupFrequency>('weekly');
  const [passphrase, setPassphrase] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  useEffect(() => {
    loadAutoBackup(services.settings).then((value) => { setConfig(value); setLoaded(true); })
      .catch(() => { setError(strings.autoBackup.failed); setLoaded(true); });
  }, [services]);

  const enable = async () => {
    if (running.current || !canAutoBackup) return;
    const problem = validateNewPassphrase(passphrase, confirmation);
    if (problem) {
      setError(problem === 'too-short' ? strings.export.tooShort(MIN_PASSPHRASE_LENGTH) : strings.export.mismatch);
      return;
    }
    running.current = true;
    setBusy(true);
    setError(undefined);
    try {
      const folder = await pickBackupFolder();
      if (!folder) return;
      await services.noteEditors.flushAll();
      await androidAutoBackup(services).enable(frequency, folder, passphrase);
      setConfig(await loadAutoBackup(services.settings));
      setPassphrase('');
      setConfirmation('');
      Alert.alert(strings.autoBackup.saved);
    } catch {
      setError(strings.autoBackup.failed);
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  const disable = async () => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    try {
      await androidAutoBackup(services).disable();
      setConfig(null);
      setError(undefined);
    } catch {
      setError(strings.autoBackup.disableFailed);
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  return <Screen>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {!canAutoBackup ? <Text style={{ color: theme.text }}>{strings.autoBackup.ios}</Text> : <>
          <Panel style={styles.group}>
            <Text style={[styles.body, { color: theme.text }]}>{strings.autoBackup.intro}</Text>
            <Text style={[styles.body, { color: theme.text }]}>{config
              ? strings.autoBackup.active(config.frequency === 'daily' ? strings.autoBackup.daily : strings.autoBackup.weekly)
              : strings.autoBackup.off}</Text>
          </Panel>
          {loaded && !config && <Panel style={styles.group}>
            <View style={styles.group}>
              {(['daily', 'weekly'] as const).map((value) => <Button key={value}
                label={`${strings.autoBackup[value]}${frequency === value ? strings.autoBackup.selected : ''}`} variant="secondary"
                accessibilityLabel={`${strings.autoBackup[value]}${frequency === value ? strings.autoBackup.selected : ''}`}
                onPress={() => setFrequency(value)} disabled={busy} testID={`auto-${value}`} />)}
            </View>
            <Text style={[styles.body, { color: theme.muted }]}>{strings.autoBackup.password}</Text>
            <Field label={strings.export.passphrase}>
              <TextInput value={passphrase} onChangeText={setPassphrase} secureTextEntry autoCapitalize="none" autoCorrect={false}
                editable={!busy} accessibilityLabel={strings.export.passphrase} style={inputStyle} testID="auto-passphrase" />
            </Field>
            <Field label={strings.export.confirm}>
              <TextInput value={confirmation} onChangeText={setConfirmation} secureTextEntry autoCapitalize="none" autoCorrect={false}
                editable={!busy} accessibilityLabel={strings.export.confirm} style={inputStyle} testID="auto-confirm" />
            </Field>
          </Panel>}
          {config && <Text style={[styles.body, { color: theme.muted }]}>{strings.autoBackup.folder}</Text>}
          {error && <LiveText style={[styles.body, { color: theme.danger }]}>{error}</LiveText>}
          {busy || !loaded ? <ActivityIndicator color={theme.accent} /> : config
            ? <Button variant="secondary" label={strings.autoBackup.disable} onPress={disable} testID="auto-disable" />
            : <Button label={strings.autoBackup.enable} onPress={enable} testID="auto-enable" />}
        </>}
      </ScrollView>
    </KeyboardAvoidingView>
  </Screen>;
}
const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  group: { padding: 16, gap: 16 },
  body: { fontSize: TYPE.body },
});

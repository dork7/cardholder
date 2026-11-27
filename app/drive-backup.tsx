import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useApp } from '../src/app/AppProvider';
import { BackupFrequency } from '../src/backup/autoBackup';
import { androidDriveBackup, canDriveBackup } from '../src/backup/androidAutoBackup';
import { RunResult, DriveBackupConfig, isStrongEnough, loadDriveBackup } from '../src/backup/drive/driveBackup';
import { DriveError } from '../src/backup/drive/driveApi';
import { MIN_DRIVE_PASSPHRASE_LENGTH } from '../src/config';
import { strings } from '../src/strings';
import { formatAgo } from '../src/time/dates';
import { Button } from '../src/ui/Button';
import { Field, useInputStyle } from '../src/ui/Field';
import { LiveText } from '../src/ui/LiveText';
import { Panel, Screen } from '../src/ui/Surface';
import { Text } from '../src/ui/Text';
import { TYPE, useTheme } from '../src/ui/theme';

// Automatic backup to the user's own Google Drive (ADR-0010).
export default function DriveBackupScreen() {
  const { services } = useApp();
  const theme = useTheme();
  const inputStyle = useInputStyle();
  const [available] = useState(canDriveBackup);
  const [config, setConfig] = useState<DriveBackupConfig | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [frequency, setFrequency] = useState<BackupFrequency>('daily');
  const [allowMobileData, setAllowMobileData] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [busy, setBusy] = useState(false);
  const running = useRef(false);

  const reload = useCallback(async () => {
    try {
      setConfig(await loadDriveBackup(services.settings));
    } catch {
      setError(strings.driveBackup.failed);
    } finally {
      setLoaded(true);
    }
  }, [services]);
  useEffect(() => { reload(); }, [reload]);

  // One action at a time; reloads the setup afterwards so problems show.
  const act = async (work: () => Promise<void>) => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError(undefined);
    setNotice(undefined);
    try {
      await work();
    } finally {
      await reload();
      running.current = false;
      setBusy(false);
    }
  };
  const report = (result: RunResult) => {
    if (result === 'done') setNotice(strings.driveBackup.backedUp);
    if (result === 'waiting-for-wifi') setNotice(strings.driveBackup.needsWifi);
  };
  const cancelled = (e: unknown) => e instanceof DriveError && e.kind === 'cancelled';

  const enable = () => {
    if (!isStrongEnough(passphrase)) {
      setError(strings.driveBackup.tooShort(MIN_DRIVE_PASSPHRASE_LENGTH));
      return;
    }
    if (passphrase !== confirmation) {
      setError(strings.export.mismatch);
      return;
    }
    act(async () => {
      try {
        await services.noteEditors.flushAll();
        const result = await androidDriveBackup(services).enable({ frequency, allowMobileData, passphrase });
        if (result === 'cancelled') return;
        setPassphrase('');
        setConfirmation('');
        Alert.alert(strings.driveBackup.saved);
      } catch {
        setError(strings.driveBackup.failed);
      }
    });
  };
  const backUpNow = () => act(async () => {
    await services.noteEditors.flushAll();
    report(await androidDriveBackup(services).runNow());
  });
  const reconnect = () => act(async () => {
    try {
      report(await androidDriveBackup(services).reconnect());
    } catch (e) {
      if (!cancelled(e)) setError(strings.driveBackup.problem.failed);
    }
  });
  const toggleMobileData = (allow: boolean) => act(() => androidDriveBackup(services).setAllowMobileData(allow));
  const disable = (deleteBackups: boolean) => act(async () => {
    try {
      await androidDriveBackup(services).disable(deleteBackups);
    } catch (e) {
      if (!cancelled(e)) setError(strings.driveBackup.disableFailed);
    }
  });
  const confirmDisable = () => Alert.alert(strings.driveBackup.disableTitle, strings.driveBackup.disableBody, [
    { text: strings.common.cancel, style: 'cancel' },
    { text: strings.driveBackup.remove, style: 'destructive', onPress: () => disable(true) },
    { text: strings.driveBackup.keep, onPress: () => disable(false) },
  ]);

  const body = [styles.body, { color: theme.text }];
  const muted = [styles.body, { color: theme.muted }];
  return <Screen>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {!available ? <Text style={body}>{strings.driveBackup.noPlayServices}</Text> : <>
          <Panel style={styles.group}>
            <Text style={body}>{strings.driveBackup.intro}</Text>
            <Text style={body} testID="drive-status">{config
              ? strings.driveBackup.on(strings.autoBackup[config.frequency].toLowerCase(), config.email)
              : strings.driveBackup.off}</Text>
            {config && <Text style={muted}>{config.lastRun
              ? strings.driveBackup.last(formatAgo(config.lastRun, Date.now()))
              : strings.driveBackup.never}</Text>}
          </Panel>

          {config?.problem && <LiveText style={body}>{strings.driveBackup.problem[config.problem]}</LiveText>}

          {loaded && !config && <Panel style={styles.group}>
            <View style={styles.group}>
              {(['daily', 'weekly'] as const).map((value) => {
                const label = `${strings.autoBackup[value]}${frequency === value ? strings.autoBackup.selected : ''}`;
                return <Button key={value} label={label} accessibilityLabel={label} variant="secondary"
                  onPress={() => setFrequency(value)} disabled={busy} testID={`drive-${value}`} />;
              })}
            </View>
            <View style={styles.row}>
              <Text style={[body, styles.grow]}>{strings.driveBackup.mobileData}</Text>
              <Switch value={allowMobileData} onValueChange={setAllowMobileData} disabled={busy}
                accessibilityLabel={strings.driveBackup.mobileData} testID="drive-mobile-data" />
            </View>
            <Text style={muted}>{strings.driveBackup.password(MIN_DRIVE_PASSPHRASE_LENGTH)}</Text>
            <Field label={strings.export.passphrase}>
              <TextInput value={passphrase} onChangeText={setPassphrase} secureTextEntry autoCapitalize="none" autoCorrect={false}
                editable={!busy} accessibilityLabel={strings.export.passphrase} style={inputStyle} testID="drive-passphrase" />
            </Field>
            <Field label={strings.export.confirm}>
              <TextInput value={confirmation} onChangeText={setConfirmation} secureTextEntry autoCapitalize="none" autoCorrect={false}
                editable={!busy} accessibilityLabel={strings.export.confirm} style={inputStyle} testID="drive-confirm" />
            </Field>
          </Panel>}

          {config && <Panel style={styles.group}>
            <View style={styles.row}>
              <Text style={[body, styles.grow]}>{strings.driveBackup.mobileData}</Text>
              <Switch value={config.allowMobileData} onValueChange={toggleMobileData} disabled={busy}
                accessibilityLabel={strings.driveBackup.mobileData} testID="drive-mobile-data" />
            </View>
            <Text style={muted}>{config.allowMobileData ? strings.driveBackup.mobileDataOn : strings.driveBackup.mobileDataOff}</Text>
          </Panel>}

          {error && <LiveText style={[styles.body, { color: theme.danger }]}>{error}</LiveText>}
          {notice && <LiveText style={muted}>{notice}</LiveText>}

          {busy && !config && <LiveText style={muted}>{strings.driveBackup.working}</LiveText>}
          {busy || !loaded ? <ActivityIndicator color={theme.accent} /> : config ? <>
            {config.problem === 'reconnect'
              ? <Button label={strings.driveBackup.reconnect} onPress={reconnect} testID="drive-reconnect" />
              : <Button label={strings.driveBackup.backUpNow} onPress={backUpNow} testID="drive-now" />}
            <Button variant="secondary" label={strings.driveBackup.disable} onPress={confirmDisable} testID="drive-disable" />
          </> : <Button label={strings.driveBackup.enable} onPress={enable} testID="drive-enable" />}
        </>}
      </ScrollView>
    </KeyboardAvoidingView>
  </Screen>;
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  group: { padding: 16, gap: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  grow: { flex: 1 },
  body: { fontSize: TYPE.body },
});

import Constants from 'expo-constants';
import { useFocusEffect, useRouter } from 'expo-router';
import { ReactNode, useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useApp } from '../src/app/AppProvider';
import { FOLDERS_ENABLED } from '../src/config';
import { authenticate, deviceLockAvailable } from '../src/security/deviceAuth';
import { strings } from '../src/strings';
import { formatAgo } from '../src/time/dates';
import { Button } from '../src/ui/Button';
import { Panel, Screen } from '../src/ui/Surface';
import { Text } from '../src/ui/Text';
import { TYPE, useTheme } from '../src/ui/theme';

export default function SettingsScreen() {
  const { services, appLock, setAppLock, homeFolders, setHomeFolders } = useApp();
  const router = useRouter();
  const theme = useTheme();
  const [lastExportAt, setLastExportAt] = useState<number | null>(null);

  // Re-read on focus, so coming back from an export shows the new date.
  useFocusEffect(
    useCallback(() => {
      services.settings.getNumber('lastExportAt').then(setLastExportAt).catch(() => {});
    }, [services]),
  );

  const [changingLock, setChangingLock] = useState(false);
  // Both ways need the phone's own lock: turning it on proves it works, turning it off proves it's you.
  const toggleLock = async (on: boolean) => {
    setChangingLock(true);
    try {
      if (on && !(await deviceLockAvailable())) {
        Alert.alert(strings.settings.noDeviceLock);
        return;
      }
      const result = await authenticate(on ? strings.lock.confirmOn : strings.lock.confirmOff, strings.common.cancel);
      if (result === 'success' || (!on && result === 'no-device-lock')) await setAppLock(on);
      else if (result === 'no-device-lock') Alert.alert(strings.settings.noDeviceLock);
    } catch (e) {
      console.warn('Changing the app lock failed', e);
      Alert.alert(strings.common.error);
    } finally {
      setChangingLock(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Section title={strings.settings.security}>
          <SwitchRow
            label={strings.settings.appLock}
            hint={strings.settings.appLockHint}
            value={appLock}
            onChange={(on) => void toggleLock(on)}
            disabled={changingLock}
            testID="app-lock-switch"
          />
        </Section>
        <Section title={strings.settings.sharing}>
          <Text style={[styles.caption, { color: theme.muted }]}>{strings.transfer.receiveHint}</Text>
          <Button label={strings.transfer.receive} onPress={() => router.push('/receive')} testID="open-receive" />
        </Section>
        <Section title={strings.settings.backup}>
          <Text style={[styles.body, { color: theme.muted }]} testID="last-backup">
            {lastExportAt === null
              ? strings.settings.neverBackedUp
              : strings.settings.lastBackup(formatAgo(lastExportAt, Date.now()))}
          </Text>
          <Button label={strings.settings.exportBackup} onPress={() => router.push('/export')} />
          <Button variant="secondary" label={strings.settings.importBackup} onPress={() => router.push('/import')} />
        </Section>
        {FOLDERS_ENABLED && (
          <>
          <Section title={strings.settings.home}>
            <SwitchRow
              label={strings.settings.folderFilter}
              hint={strings.settings.folderFilterHint}
              value={homeFolders.filter}
              onChange={(filter) => void setHomeFolders({ ...homeFolders, filter }).catch(() => {})}
              testID="home-folder-filter-switch"
            />
            <SwitchRow
              label={strings.settings.manageShortcut}
              hint={strings.settings.manageShortcutHint}
              value={homeFolders.manage}
              onChange={(manage) => void setHomeFolders({ ...homeFolders, manage }).catch(() => {})}
              testID="home-manage-folders-switch"
            />
          </Section>
          <Section title={strings.folders.title}>
            <Button variant="secondary" label={strings.folders.manage} onPress={() => router.push('/folders')} testID="manage-folders" />
          </Section>
          </>
        )}
        <Section title={strings.settings.about}>
          <Text style={[styles.body, { color: theme.text }]}>{strings.promise}</Text>
          <Button variant="secondary" label={strings.settings.privacyPolicy} onPress={() => router.push('/privacy')} />
          <Text style={[styles.caption, { color: theme.muted }]}>
            {strings.settings.version(Constants.expoConfig?.version ?? '')}
          </Text>
        </Section>
      </ScrollView>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <Panel style={styles.section}>
      <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
        {title}
      </Text>
      {children}
    </Panel>
  );
}

function SwitchRow(props: {
  label: string;
  hint: string;
  value: boolean;
  onChange: (on: boolean) => void;
  disabled?: boolean;
  testID: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={[styles.body, { color: theme.text }]}>{props.label}</Text>
        <Text style={[styles.caption, { color: theme.muted }]}>{props.hint}</Text>
      </View>
      <Switch
        value={props.value}
        onValueChange={props.onChange}
        disabled={props.disabled}
        trackColor={{ true: theme.accent, false: theme.rosette }}
        accessibilityLabel={props.label}
        accessibilityHint={props.hint}
        testID={props.testID}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  section: { padding: 16, gap: 12 },
  title: { fontSize: TYPE.section, fontWeight: '700' },
  body: { fontSize: TYPE.body },
  caption: { fontSize: TYPE.secondary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { flex: 1, gap: 4 },
});

import Constants from 'expo-constants';
import { useFocusEffect, useRouter } from 'expo-router';
import { ReactNode, useCallback, useEffect, useState } from 'react';
import { Alert, AppState, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useApp } from '../src/app/AppProvider';
import { FREE_CARD_LIMIT, FOLDERS_ENABLED } from '../src/config';
import { ProblemsSettings } from '../src/diagnostics/ProblemsSettings';
import { authenticate, deviceLockAvailable } from '../src/security/deviceAuth';
import { strings } from '../src/strings';
import { formatAgo } from '../src/time/dates';
import { canSelfUpdate, clearDownloads } from '../src/update/download';
import {
  cancelUpdateDownload,
  checkForUpdate,
  downloadUpdate,
  getUpdateState,
  installUpdate,
  refreshInstallPermission,
  useUpdateState,
} from '../src/update/updateStore';
import { Button } from '../src/ui/Button';
import { Panel, Screen } from '../src/ui/Surface';
import { Text } from '../src/ui/Text';
import { TYPE, useTheme } from '../src/ui/theme';
import { LiveText } from '../src/ui/LiveText';
import { RetroIcon, RetroIconName } from '../src/ui/RetroIcon';

export default function SettingsScreen() {
  const { services, cards, unlocked, appLock, setAppLock, homeFolders, setHomeFolders, cardBrightness, setCardBrightness, stackVertical, setStackVertical } =
    useApp();
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
        <Section title={strings.settings.purchases}>
          <Text style={[styles.body, { color: theme.text }]}>
            {unlocked ? strings.settings.unlocked : strings.settings.freeUsage(cards.length, FREE_CARD_LIMIT)}
          </Text>
          <Button
            variant="secondary"
            label={unlocked ? strings.settings.restore : strings.settings.unlock}
            onPress={() => router.push('/paywall')}
            testID="manage-purchases"
          />
        </Section>
        <Section icon="lock" title={strings.settings.security}>
          <SwitchRow
            label={strings.settings.appLock}
            hint={strings.settings.appLockHint}
            value={appLock}
            onChange={(on) => void toggleLock(on)}
            disabled={changingLock}
            testID="app-lock-switch"
          />
        </Section>
        <Section icon="appearance" title={strings.settings.cardView}>
          <SwitchRow
            label={strings.settings.fullBrightness}
            hint={strings.settings.fullBrightnessHint}
            value={cardBrightness}
            onChange={(on) => void setCardBrightness(on).catch(() => {})}
            testID="card-brightness-switch"
          />
          <SwitchRow
            label={strings.settings.verticalSwipe}
            hint={strings.settings.verticalSwipeHint}
            value={stackVertical}
            onChange={(on) => void setStackVertical(on).catch(() => {})}
            testID="stack-vertical-switch"
          />
        </Section>
        <Section title={strings.tagsScreen.title}>
          <Button
            variant="secondary"
            label={strings.tagsScreen.manage}
            onPress={() => router.push('/tags')}
            testID="manage-tags"
          />
        </Section>
        <Section icon="backup" title={strings.settings.backup}>
          <Text style={[styles.body, { color: theme.muted }]} testID="last-backup">
            {lastExportAt === null
              ? strings.settings.neverBackedUp
              : strings.settings.lastBackup(formatAgo(lastExportAt, Date.now()))}
          </Text>
          <Button icon="backup" label={strings.settings.exportBackup} onPress={() => router.push('/export')} />
          <Button icon="import" variant="secondary" label={strings.settings.importBackup} onPress={() => router.push('/import')} />
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
        {canSelfUpdate && <UpdateSection />}
        <Section title={strings.report.title}>
          <ProblemsSettings />
        </Section>
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

// Android copies from GitHub Releases update from here. Nothing is fetched until the user taps Check.
function UpdateSection() {
  const theme = useTheme();
  const update = useUpdateState();

  // An APK left from an earlier visit (installed, or never installed) is only wasted space.
  useEffect(() => {
    if (getUpdateState().status === 'idle') clearDownloads();
  }, []);
  // Coming back from Android's "Install unknown apps" page brings the app to the foreground; it doesn't
  // refocus the screen, so listen for that.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => next === 'active' && refreshInstallPermission());
    return () => sub.remove();
  }, []);

  const failure = 'failure' in update && update.failure;
  const notes = 'manifest' in update ? update.manifest.releaseNotes : '';
  return (
    <Section title={strings.update.title}>
      {update.status === 'available' || update.status === 'downloading' || update.status === 'ready' ? (
        <Text style={[styles.body, { color: theme.text }]} testID="update-version">
          {update.status === 'ready'
            ? strings.update.ready(update.manifest.versionName)
            : strings.update.available(update.manifest.versionName)}
        </Text>
      ) : (
        <Text style={[styles.caption, { color: theme.muted }]}>{strings.update.about}</Text>
      )}
      {notes !== '' && (
        <View style={styles.notes} testID="update-notes">
          <Text style={[styles.caption, { color: theme.muted, fontWeight: '700' }]}>{strings.update.whatsNew}</Text>
          <Text style={[styles.caption, { color: theme.text }]}>{notes}</Text>
        </View>
      )}
      {update.status === 'up-to-date' && (
        <LiveText style={[styles.body, { color: theme.text }]} testID="update-current">
          {strings.update.upToDate}
        </LiveText>
      )}
      {failure && (
        <LiveText style={[styles.caption, { color: theme.danger }]} testID="update-failed">
          {strings.update.failed[failure]}
        </LiveText>
      )}
      {update.status === 'available' ? (
        <Button
          label={strings.update.download(update.manifest.size === null ? null : Math.round(update.manifest.size / 1_000_000))}
          onPress={() => void downloadUpdate()}
          testID="download-update"
        />
      ) : update.status === 'downloading' ? (
        <>
          <Text style={[styles.body, { color: theme.text }]} accessibilityLiveRegion="polite" testID="update-progress">
            {strings.update.downloading(update.progress === null ? null : Math.round(update.progress * 100))}
          </Text>
          <Button variant="secondary" label={strings.update.stop} onPress={cancelUpdateDownload} testID="stop-update" />
        </>
      ) : update.status === 'ready' ? (
        <>
          {update.needsPermission && (
            <Text style={[styles.caption, { color: theme.muted }]} testID="update-permission">
              {strings.update.permissionHint}
            </Text>
          )}
          <Button label={strings.update.install} onPress={installUpdate} testID="install-update" />
          <Text style={[styles.caption, { color: theme.muted }]}>{strings.update.keepsCards}</Text>
        </>
      ) : (
        <Button
          variant="secondary"
          label={update.status === 'checking' ? strings.update.checking : strings.update.check}
          onPress={() => void checkForUpdate()}
          disabled={update.status === 'checking'}
          testID="check-update"
        />
      )}
    </Section>
  );
}

function Section({ title, icon, children }: { title: string; icon?: RetroIconName; children: ReactNode }) {
  const theme = useTheme();
  return (
    <Panel style={styles.section}>
      <View style={styles.sectionHeading}>
        {icon && <RetroIcon name={icon} size={28} />}
        <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
          {title}
        </Text>
      </View>
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
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: TYPE.section, fontWeight: '700' },
  body: { fontSize: TYPE.body },
  caption: { fontSize: TYPE.secondary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { flex: 1, gap: 4 },
  notes: { gap: 4 },
});

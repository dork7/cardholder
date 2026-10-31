import Constants from 'expo-constants';
import { useFocusEffect, useRouter } from 'expo-router';
import { ReactNode, useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useApp } from '../src/app/AppProvider';
import { cancelModelDownload, removeModel, startModelDownload, useModelState } from '../src/analysis/modelDownload';
import { canReadText } from '../src/analysis/recognizer';
import { FOLDERS_ENABLED } from '../src/config';
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
        {canReadText && <AiSection />}
        <Section title={strings.categoriesScreen.title}>
          <Button
            variant="secondary"
            label={strings.categoriesScreen.manage}
            onPress={() => router.push('/categories')}
            testID="manage-categories"
          />
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
        {canSelfUpdate && <UpdateSection />}
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

// The AI model is never downloaded without the user saying so here, after being told the size and
// where it comes from.
function AiSection() {
  const theme = useTheme();
  const model = useModelState();

  const download = () =>
    Alert.alert(strings.ai.confirmTitle, strings.ai.confirmMessage, [
      { text: strings.common.cancel, style: 'cancel' },
      { text: strings.ai.confirm, onPress: () => void startModelDownload() },
    ]);

  const remove = () =>
    Alert.alert(strings.ai.removeTitle, strings.ai.removeMessage, [
      { text: strings.common.cancel, style: 'cancel' },
      {
        text: strings.common.delete,
        style: 'destructive',
        onPress: () =>
          void removeModel().catch((e) => {
            console.warn('Deleting the AI model failed', e);
            Alert.alert(strings.common.error);
          }),
      },
    ]);

  return (
    <Section title={strings.ai.title}>
      {model.status === 'present' ? (
        <>
          <Text style={[styles.body, { color: theme.text }]}>{strings.ai.ready}</Text>
          <Button variant="danger" label={strings.ai.remove} onPress={remove} testID="delete-ai-model" />
        </>
      ) : model.status === 'downloading' ? (
        <>
          <Text style={[styles.body, { color: theme.text }]} accessibilityLiveRegion="polite" testID="ai-model-progress">
            {strings.ai.downloading(model.progress === null ? null : Math.round(model.progress * 100))}
          </Text>
          <Button variant="secondary" label={strings.ai.stop} onPress={cancelModelDownload} testID="stop-ai-model" />
        </>
      ) : (
        <>
          <Text style={[styles.body, { color: theme.text }]}>{strings.ai.about}</Text>
          <Text style={[styles.caption, { color: theme.muted }]}>{strings.ai.sizeHint}</Text>
          {model.failure && (
            <Text style={[styles.caption, { color: theme.danger }]} accessibilityLiveRegion="polite" testID="ai-model-failed">
              {strings.ai.failed[model.failure]}
            </Text>
          )}
          <Button label={strings.ai.download} onPress={download} testID="download-ai-model" />
        </>
      )}
      <Text style={[styles.caption, { color: theme.muted }]}>{strings.ai.license}</Text>
    </Section>
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
  // Coming back from Android's "Install unknown apps" page.
  useFocusEffect(useCallback(() => refreshInstallPermission(), []));

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
        <Text style={[styles.body, { color: theme.text }]} accessibilityLiveRegion="polite" testID="update-current">
          {strings.update.upToDate}
        </Text>
      )}
      {failure && (
        <Text style={[styles.caption, { color: theme.danger }]} accessibilityLiveRegion="polite" testID="update-failed">
          {strings.update.failed[failure]}
        </Text>
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
  notes: { gap: 4 },
});

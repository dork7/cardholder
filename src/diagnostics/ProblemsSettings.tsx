import { Alert, StyleSheet, View } from 'react-native';
import { strings } from '../strings';
import { formatAgo } from '../time/dates';
import { Button } from '../ui/Button';
import { Text } from '../ui/Text';
import { TYPE, useTheme } from '../ui/theme';
import { CrashRecord, dismissCrash, usePendingCrash } from './crashes';
import { canEmail, emailReport, shareReport } from './send';

// Settings → Problems: the last unexpected close, and the buttons that send it. The only way a
// report leaves the phone (ADR 0007).
export function ProblemsSettings() {
  const theme = useTheme();
  const pending = usePendingCrash();
  const record = pending?.record ?? null;

  return (
    <>
      <Text style={[styles.body, { color: theme.text }]}>{strings.report.about}</Text>
      {record ? (
        <View style={styles.crash} testID="pending-crash">
          <Text style={[styles.body, { color: theme.text }]}>{strings.report.crashed(formatAgo(record.at, Date.now()))}</Text>
          <Text style={[styles.caption, { color: theme.muted }]}>
            {strings.report.kinds[record.kind]}: {record.message}
          </Text>
        </View>
      ) : (
        <Text style={[styles.caption, { color: theme.muted }]} testID="no-crash">
          {strings.report.none}
        </Text>
      )}
      {canEmail && <Button label={strings.report.email} onPress={() => void sendReport(record, 'email')} testID="email-report" />}
      <Button
        variant={canEmail ? 'secondary' : 'primary'}
        label={record ? strings.report.share : strings.report.shareLog}
        onPress={() => void sendReport(record, 'share')}
        testID="share-report"
      />
      {record && <Button variant="secondary" label={strings.report.dismiss} onPress={dismissCrash} testID="dismiss-crash" />}
    </>
  );
}

// Email where there is an address and a mail app, the share sheet otherwise. Once a report has gone
// out, the crash is no longer pending.
export async function sendReport(record: CrashRecord | null, how: 'email' | 'share'): Promise<void> {
  try {
    if (how === 'email') {
      if (!(await emailReport(record))) {
        Alert.alert(strings.report.noEmailApp);
        return;
      }
    } else {
      await shareReport(record);
    }
    if (record) dismissCrash();
  } catch (e) {
    console.warn('Sending the report failed', e);
    Alert.alert(strings.common.error);
  }
}

const styles = StyleSheet.create({
  body: { fontSize: TYPE.body },
  caption: { fontSize: TYPE.secondary },
  crash: { gap: 4 },
});

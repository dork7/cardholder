import { Component, ErrorInfo, ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { strings } from '../strings';
import { Button } from '../ui/Button';
import { Panel, Screen } from '../ui/Surface';
import { Text } from '../ui/Text';
import { useTheme } from '../ui/theme';
import { CrashRecord, toRecord } from './crashes';
import { log } from './install';
import { sendReport } from './ProblemsSettings';
import { canEmail } from './send';

// Catches an error thrown while rendering, which React Native would otherwise turn into a crash with
// nothing on screen. Logs it, shows a screen that says so, and offers Try again and a report.
interface State {
  record: CrashRecord | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { record: null };

  static getDerivedStateFromError(error: unknown): State {
    return { record: toRecord(error, 'js', Date.now()) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    log().error('A screen failed to render', error, info.componentStack ?? '');
  }

  render() {
    if (this.state.record) return <CrashScreen record={this.state.record} onRetry={() => this.setState({ record: null })} />;
    return this.props.children;
  }
}

function CrashScreen({ record, onRetry }: { record: CrashRecord; onRetry: () => void }) {
  const theme = useTheme();
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
        <Panel style={styles.panel}>
          <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
            {strings.report.crashScreenTitle}
          </Text>
          <Text style={[styles.body, { color: theme.muted }]}>{strings.report.crashScreenBody}</Text>
          <Button label={strings.report.tryAgain} onPress={onRetry} testID="crash-retry" />
          <Button
            variant="secondary"
            label={canEmail ? strings.report.email : strings.report.share}
            onPress={() => void sendReport(record, canEmail ? 'email' : 'share')}
            testID="crash-report"
          />
        </Panel>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center', padding: 16 },
  panel: { padding: 24, gap: 16 },
  title: { fontSize: 24, fontWeight: '700' },
  body: { fontSize: 18 },
});

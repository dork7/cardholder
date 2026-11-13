import { useEffect } from 'react';
import { Alert } from 'react-native';
import { strings } from '../strings';
import { markPrompted, usePendingCrash } from './crashes';
import { sendReport } from './ProblemsSettings';
import { canEmail } from './send';

// Once per crash, after the app is open and unlocked: asks whether to send it. "Not now" leaves it
// in Settings → Problems; nothing is sent without a tap here or there.
export function CrashPrompt() {
  const pending = usePendingCrash();
  const ask = pending !== null && !pending.prompted;
  useEffect(() => {
    if (!ask || !pending) return;
    void markPrompted();
    Alert.alert(strings.report.promptTitle, strings.report.promptBody, [
      { text: strings.report.promptNotNow, style: 'cancel' },
      { text: strings.report.promptSend, onPress: () => void sendReport(pending.record, canEmail ? 'email' : 'share') },
    ]);
  }, [ask, pending]);
  return null;
}

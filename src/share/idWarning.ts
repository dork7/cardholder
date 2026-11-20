import { Alert } from 'react-native';
import { Settings } from '../storage/settings';
import { strings } from '../strings';

// Whether sharing an ID asks first. On until turned off: only a stored '0' skips the warning.
export async function loadWarnIdShare(settings: Settings): Promise<boolean> {
  return (await settings.get('warnIdShare')) !== '0';
}

export async function saveWarnIdShare(settings: Settings, on: boolean): Promise<void> {
  await settings.set('warnIdShare', on ? '1' : '0');
}

// An ID is the one document worth a second thought before an unencrypted copy leaves the app, so
// with the warning on it asks once: Cancel, Share, or Don't ask again (which shares and turns the
// warning off). Anything else, or with the warning off, shares at once. Used by every way out:
// Quick share, PDF, the .md file and the Documents list selection.
export function confirmIdShare(options: {
  hasId: boolean;
  warn: boolean;
  title: string;
  body: string;
  go: () => unknown;
  stopWarning: () => unknown;
}): void {
  const { hasId, warn, title, body, go, stopWarning } = options;
  if (!hasId || !warn) {
    void go();
    return;
  }
  Alert.alert(title, body, [
    { text: strings.common.cancel, style: 'cancel' },
    { text: strings.idShare.share, onPress: () => void go() },
    {
      text: strings.idShare.dontAskAgain,
      onPress: () => {
        void Promise.resolve(stopWarning()).catch((e) => console.warn('Saving the ID warning setting failed', e));
        void go();
      },
    },
  ]);
}

import { useApp } from '../app/AppProvider';
import { confirmIdShare } from './idWarning';

// confirmIdShare wired to the app's "Warn before sharing an ID" setting: Don't ask again turns it off.
export function useConfirmIdShare() {
  const { warnIdShare, setWarnIdShare } = useApp();
  return (options: { hasId: boolean; title: string; body: string; go: () => unknown }) =>
    confirmIdShare({ ...options, warn: warnIdShare, stopWarning: () => setWarnIdShare(false) });
}

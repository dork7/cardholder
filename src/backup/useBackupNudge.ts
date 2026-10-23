import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useApp } from '../app/AppProvider';
import { readNudgeInput, shouldNudgeBackup, snoozeBackupNudge } from './nudge';

// Re-evaluated whenever the cards change and whenever home regains focus (e.g. back from export).
export function useBackupNudge(): { visible: boolean; snooze: () => void } {
  const { services, cards } = useApp();
  const [visible, setVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      readNudgeInput(services.store, services.settings, Date.now())
        .then((input) => live && setVisible(shouldNudgeBackup(input)))
        .catch(() => {});
      return () => {
        live = false;
      };
    }, [services, cards]),
  );

  const snooze = useCallback(() => {
    setVisible(false);
    snoozeBackupNudge(services.settings, Date.now()).catch(() => {});
  }, [services]);

  return { visible, snooze };
}

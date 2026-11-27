import * as Notifications from 'expo-notifications';
import { useQuickActionCallback } from 'expo-quick-actions/hooks';
import { Href, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { reminderCardId, reminderNoteId } from '../reminders/scheduler';
import { useAppLocked } from '../security/AppLockGate';
import { shortcutHref } from '../shortcuts/quickActions';

// The overdue Drive backup notice (src/backup/androidAutoBackup.ts) opens the Drive backup screen.
export function backupNoticeHref(response: Notifications.NotificationResponse | null): '/drive-backup' | null {
  if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return null;
  return response.notification.request.content.data?.href === '/drive-backup' ? '/drive-backup' : null;
}

// Opens what a tapped reminder or a home-screen shortcut points at, whether the app was running or the
// tap launched it. Mounted once inside the app-lock gate.
export function useLaunchLinks(): void {
  const router = useRouter();
  const locked = useAppLocked();
  const [pendingShortcut, setPendingShortcut] = useState<string | null>(null);

  const response = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);
  useEffect(() => {
    const cardId = reminderCardId(response ?? null);
    const noteId = reminderNoteId(response ?? null);
    const backup = backupNoticeHref(response ?? null);
    const key = response?.notification.request.identifier ?? null;
    if ((!cardId && !noteId && !backup) || key === handled.current) return;
    handled.current = key;
    if (backup) router.push(backup);
    else if (noteId) router.push(`/note-view/${noteId}`);
    else router.push(`/card/${cardId}`);
  }, [response, router]);

  // A stable callback keeps the library from replaying the cold-start action on every render.
  useQuickActionCallback(useCallback((action) => {
    const href = shortcutHref(action);
    if (href) setPendingShortcut(href);
  }, []));

  useEffect(() => {
    if (locked || !pendingShortcut) return;
    setPendingShortcut(null);
    router.push(pendingShortcut as Href);
  }, [locked, pendingShortcut, router]);
}

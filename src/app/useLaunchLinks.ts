import * as Notifications from 'expo-notifications';
import { useQuickActionCallback } from 'expo-quick-actions/hooks';
import { Href, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { reminderCardId, reminderNoteId } from '../reminders/scheduler';
import { shortcutHref } from '../shortcuts/quickActions';

// Opens what a tapped reminder or a home-screen shortcut points at, whether the app was running or the
// tap launched it. Used by Home, which is mounted under every other screen once boot is done.
export function useLaunchLinks(): void {
  const router = useRouter();

  const response = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);
  useEffect(() => {
    const cardId = reminderCardId(response ?? null);
    const noteId = reminderNoteId(response ?? null);
    const key = response?.notification.request.identifier ?? null;
    if ((!cardId && !noteId) || key === handled.current) return;
    handled.current = key;
    if (noteId) router.push(`/note/${noteId}`);
    else router.push(`/card/${cardId}`);
  }, [response, router]);

  useQuickActionCallback((action) => {
    const href = shortcutHref(action);
    if (href) router.push(href as Href);
  });
}

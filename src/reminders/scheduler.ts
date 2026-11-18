import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { MAX_SCHEDULED_REMINDERS } from '../config';
import { Note } from '../notes/noteStore';
import { Card, Person } from '../cards/types';
import { strings } from '../strings';
import { planReminders } from './plan';

const CHANNEL_ID = 'reminders';

export async function setupNotifications(): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: strings.reminders.channelName,
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

// The card a tapped reminder is about, or null for any other notification.
export function reminderCardId(response: Notifications.NotificationResponse | null): string | null {
  if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return null;
  const cardId = response.notification.request.content.data?.cardId;
  return typeof cardId === 'string' && /^[a-zA-Z0-9_-]+$/.test(cardId) ? cardId : null;
}

export function reminderNoteId(response: Notifications.NotificationResponse | null): string | null {
  if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return null;
  const noteId = response.notification.request.content.data?.noteId;
  return typeof noteId === 'string' && /^[a-zA-Z0-9_-]+$/.test(noteId) ? noteId : null;
}

// Called when the user saves a card with an expiry date — never at launch.
export async function requestReminderPermissionOnce(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return true;
  // Android 13+ reports a permission it has never asked for as denied, with canAskAgain still true.
  if (current.status === 'denied' && !current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).status === 'granted';
}

// Re-plans from scratch so edits, deletes, imports and the 60-reminder window are always right.
export async function syncReminders(cards: Card[], now: Date = new Date(), notes: readonly Note[] = [], people: readonly Person[] = []): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if ((await Notifications.getPermissionsAsync()).status !== 'granted') return;
  const planned = [
    ...planReminders(cards, now, MAX_SCHEDULED_REMINDERS, people).map((r) => ({ id: r.id, fireAt: r.fireAt, title: r.title, body: r.body, data: { cardId: r.cardId } })),
    ...notes.filter((n) => n.reminderAt !== undefined && Number.isFinite(n.reminderAt) && n.reminderAt > now.getTime())
      .map((n) => ({ id: `note:${n.id}`, fireAt: new Date(n.reminderAt!), title: strings.notes.reminderNotificationTitle,
        body: strings.notes.reminderNotificationBody, data: { noteId: n.id } })),
  ].sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime() || a.id.localeCompare(b.id)).slice(0, MAX_SCHEDULED_REMINDERS);
  for (const reminder of planned) {
    await Notifications.scheduleNotificationAsync({
      identifier: reminder.id,
      content: { title: reminder.title, body: reminder.body, data: reminder.data },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminder.fireAt, channelId: CHANNEL_ID },
    });
  }
}

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Card } from '../cards/types';
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
  return typeof cardId === 'string' ? cardId : null;
}

// Called when the user saves a card with an expiry date — never at launch.
export async function requestReminderPermissionOnce(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.status !== 'undetermined') return current.status === 'granted';
  return (await Notifications.requestPermissionsAsync()).status === 'granted';
}

// Re-plans from scratch so edits, deletes, imports and the 60-reminder window are always right.
export async function syncReminders(cards: Card[], now: Date = new Date()): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if ((await Notifications.getPermissionsAsync()).status !== 'granted') return;
  for (const reminder of planReminders(cards, now)) {
    await Notifications.scheduleNotificationAsync({
      identifier: reminder.id,
      content: { title: reminder.title, body: reminder.body, data: { cardId: reminder.cardId } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminder.fireAt, channelId: CHANNEL_ID },
    });
  }
}

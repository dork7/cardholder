import * as Notifications from 'expo-notifications';
import { ReminderNotification } from './plan';

// Configure how notifications are handled when the app is in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function scheduleReminders(notifications: ReminderNotification[]): Promise<void> {
  // Clear existing scheduled notifications to avoid duplicates.
  await Notifications.cancelAllScheduledNotificationsAsync();

  for (const notification of notifications) {
    await Notifications.scheduleNotificationAsync({
      identifier: notification.id,
      content: {
        title: notification.title,
        body: notification.body,
      },
      trigger: {
        date: notification.date,
      },
    });
  }
}

export async function clearReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

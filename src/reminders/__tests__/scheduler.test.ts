import { scheduleReminders, clearReminders } from '../scheduler';
import { ReminderNotification } from '../plan';
import * as Notifications from 'expo-notifications';

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
}));

describe('scheduler', () => {
  const notifications: ReminderNotification[] = [
    {
      id: '1',
      title: 'Title 1',
      body: 'Body 1',
      date: new Date('2026-12-01T09:00:00'),
    },
    {
      id: '2',
      title: 'Title 2',
      body: 'Body 2',
      date: new Date('2026-12-02T09:00:00'),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('scheduleReminders calls cancelAll and scheduleNotificationAsync for each', async () => {
    await scheduleReminders(notifications);
    expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        identifier: '1',
        content: { title: 'Title 1', body: 'Body 1' },
      }),
    );
  });

  test('clearReminders calls cancelAllScheduledNotificationsAsync', async () => {
    await clearReminders();
    expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
  });
});

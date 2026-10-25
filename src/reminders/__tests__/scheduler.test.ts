import * as Notifications from 'expo-notifications';
import { makeCard } from '../../../test/fixtures';
import { strings } from '../../strings';
import { reminderCardId, requestReminderPermissionOnce, syncReminders } from '../scheduler';

jest.mock('expo-notifications', () => ({
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  scheduleNotificationAsync: jest.fn(async () => 'id'),
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => {}),
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
  DEFAULT_ACTION_IDENTIFIER: 'expo.modules.notifications.actions.DEFAULT',
}));

const mocked = Notifications as jest.Mocked<typeof Notifications>;
const now = new Date(2027, 0, 1, 12, 0);

beforeEach(() => jest.clearAllMocks());

test('cancels everything, then schedules the plan', async () => {
  await syncReminders([makeCard({ id: 'c1', name: 'Visa', expiresOn: '2027-06-30' })], now);
  expect(mocked.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
  expect(mocked.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
  expect(mocked.scheduleNotificationAsync).toHaveBeenCalledWith({
    identifier: 'c1:30',
    content: { title: 'Visa expires in 30 days', body: 'Tap to open the card.', data: { cardId: 'c1' } },
    trigger: { type: 'date', date: new Date(2027, 4, 31, 9, 0), channelId: 'reminders' },
  });
});

test('without permission it only cancels', async () => {
  mocked.getPermissionsAsync.mockResolvedValueOnce({ status: 'denied' } as never);
  await syncReminders([makeCard({ expiresOn: '2027-06-30' })], now);
  expect(mocked.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
  expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
});

test('asks for permission only when it has never been asked', async () => {
  mocked.getPermissionsAsync.mockResolvedValueOnce({ status: 'undetermined' } as never);
  expect(await requestReminderPermissionOnce()).toBe(true);
  expect(mocked.requestPermissionsAsync).toHaveBeenCalledTimes(1);

  mocked.getPermissionsAsync.mockResolvedValueOnce({ status: 'denied' } as never);
  expect(await requestReminderPermissionOnce()).toBe(false);
  expect(mocked.requestPermissionsAsync).toHaveBeenCalledTimes(1);
});

test('tapping a reminder names its card; other actions and notifications do not', () => {
  const response = (data: unknown, actionIdentifier = 'expo.modules.notifications.actions.DEFAULT') =>
    ({ actionIdentifier, notification: { request: { identifier: 'c1:7', content: { data } } } }) as unknown as Notifications.NotificationResponse;
  expect(reminderCardId(response({ cardId: 'c1' }))).toBe('c1');
  expect(reminderCardId(response({ cardId: 'c1' }, 'dismiss'))).toBeNull();
  expect(reminderCardId(response({}))).toBeNull();
  expect(reminderCardId(null)).toBeNull();
});

test('a reminder one day out reads "1 day"', () => {
  expect(strings.reminders.title('Visa', 1)).toBe('Visa expires in 1 day');
});

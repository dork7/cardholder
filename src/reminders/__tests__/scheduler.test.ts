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
  expect(mocked.scheduleNotificationAsync).toHaveBeenCalledTimes(15);
  expect(mocked.scheduleNotificationAsync).toHaveBeenCalledWith({
    identifier: 'c1:14',
    content: { title: 'Visa expires in 14 days', body: 'Tap to open the document.', data: { cardId: 'c1' } },
    trigger: { type: 'date', date: new Date(2027, 5, 16, 9, 0), channelId: 'reminders' },
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

  mocked.getPermissionsAsync.mockResolvedValueOnce({ status: 'denied', canAskAgain: false } as never);
  expect(await requestReminderPermissionOnce()).toBe(false);
  expect(mocked.requestPermissionsAsync).toHaveBeenCalledTimes(1);
});

test('asks on Android 13+, which reports a never-asked permission as denied but askable', async () => {
  mocked.getPermissionsAsync.mockResolvedValueOnce({ status: 'denied', canAskAgain: true } as never);
  expect(await requestReminderPermissionOnce()).toBe(true);
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

test('a reminder one day out reads "1 day", and on the day "today"', () => {
  expect(strings.reminders.title('Visa', 1)).toBe('Visa expires in 1 day');
  expect(strings.reminders.title('Visa', 0)).toBe('Visa expires today');
});

test('note reminders share the schedule, never expose note text, and disappear when cleared', async () => {
  const notes = [{ id: 'n', title: 'Private title', body: 'Private body', tags: [], documentId: null, pinned: false, createdAt: 1, updatedAt: 1, reminderAt: new Date(2027, 0, 2, 15, 30).getTime() }];
  await syncReminders([], now, notes);
  expect(mocked.scheduleNotificationAsync).toHaveBeenLastCalledWith({
    identifier: 'note:n',
    content: { title: strings.notes.reminderNotificationTitle, body: strings.notes.reminderNotificationBody, data: { noteId: 'n' } },
    trigger: { type: 'date', date: new Date(2027, 0, 2, 15, 30), channelId: 'reminders' },
  });
  expect(JSON.stringify(mocked.scheduleNotificationAsync.mock.calls)).not.toContain('Private');
  mocked.scheduleNotificationAsync.mockClear();
  await syncReminders([], now, [{ ...notes[0], reminderAt: undefined }]);
  expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
});

test('the nearest 60 reminders win across notes and documents; past notes are ignored', async () => {
  const notes = Array.from({ length: 65 }, (_, i) => ({ id: `n${i}`, title: 'Secret', body: 'Secret', tags: [], documentId: null, pinned: false, createdAt: 1, updatedAt: 1, reminderAt: now.getTime() + (i + 1) * 60_000 }));
  notes.push({ ...notes[0], id: 'past', reminderAt: now.getTime() });
  await syncReminders([makeCard({ expiresOn: '2027-06-30' })], now, notes);
  expect(mocked.scheduleNotificationAsync).toHaveBeenCalledTimes(60);
  expect(mocked.scheduleNotificationAsync.mock.calls[0][0].identifier).toBe('note:n0');
  expect(mocked.scheduleNotificationAsync.mock.calls[59][0].identifier).toBe('note:n59');
});

test('note reminder taps resolve only safe note IDs and the default action', () => {
  const { reminderNoteId } = require('../scheduler');
  const response = (data: unknown, actionIdentifier = 'expo.modules.notifications.actions.DEFAULT') =>
    ({ actionIdentifier, notification: { request: { identifier: 'note:n', content: { data } } } });
  expect(reminderNoteId(response({ noteId: 'n' }))).toBe('n');
  expect(reminderNoteId(response({ noteId: '../settings' }))).toBeNull();
  expect(reminderNoteId(response({ noteId: 'n' }, 'dismiss'))).toBeNull();
  expect(reminderNoteId(response({ cardId: 'c' }))).toBeNull();
});

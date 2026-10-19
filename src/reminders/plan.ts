import { Card } from '../cards/types';
import { REMINDER_DAYS_BEFORE, REMINDER_HOUR } from '../config';
import { parseIsoDate } from '../time/dates';
import { strings } from '../strings';

export interface ReminderNotification {
  id: string;
  title: string;
  body: string;
  date: Date;
}

export function planReminders(cards: Card[]): ReminderNotification[] {
  const notifications: ReminderNotification[] = [];

  for (const card of cards) {
    if (!card.expiresOn) continue;

    const dateParts = parseIsoDate(card.expiresOn);
    if (!dateParts) continue;

    const expiryDate = new Date(dateParts.year, dateParts.month - 1, dateParts.day);
    for (const daysBefore of REMINDER_DAYS_BEFORE) {
      const reminderDate = new Date(expiryDate);
      reminderDate.setDate(expiryDate.getDate() - daysBefore);
      reminderDate.setHours(REMINDER_HOUR, 0, 0, 0);

      const now = new Date();
      if (reminderDate.getTime() > now.getTime()) {
        notifications.push({
          id: `reminder-${card.id}-${daysBefore}`,
          title: strings.reminders.title(card.name, daysBefore),
          body: strings.reminders.body,
          date: reminderDate,
        });
      }
    }
  }

  return notifications;
}

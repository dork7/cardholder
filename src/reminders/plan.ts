import { Card } from '../cards/types';
import { MAX_SCHEDULED_REMINDERS, REMINDER_DAYS_BEFORE, REMINDER_HOUR } from '../config';
import { strings } from '../strings';
import { parseIsoDate } from '../time/dates';

export interface PlannedReminder {
  id: string;
  cardId: string;
  daysBefore: number;
  fireAt: Date;
  title: string;
  body: string;
}

export function planReminders(
  cards: ReadonlyArray<Pick<Card, 'id' | 'name' | 'expiresOn'>>,
  now: Date,
  max: number = MAX_SCHEDULED_REMINDERS,
): PlannedReminder[] {
  const planned: PlannedReminder[] = [];
  for (const card of cards) {
    const expiry = card.expiresOn ? parseIsoDate(card.expiresOn) : null;
    if (!expiry) continue;
    for (const daysBefore of REMINDER_DAYS_BEFORE) {
      const fireAt = new Date(expiry.year, expiry.month - 1, expiry.day - daysBefore, REMINDER_HOUR, 0, 0, 0);
      if (fireAt.getTime() <= now.getTime()) continue;
      planned.push({
        id: `${card.id}:${daysBefore}`,
        cardId: card.id,
        daysBefore,
        fireAt,
        title: strings.reminders.title(card.name, daysBefore),
        body: strings.reminders.body,
      });
    }
  }
  return planned.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime()).slice(0, max);
}

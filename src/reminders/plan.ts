import { displayName } from '../cards/display';
import { Card, Person } from '../cards/types';
import { MAX_SCHEDULED_REMINDERS, REMINDER_HOUR } from '../config';
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

// One reminder a day for each card, from its remindDaysBefore days out to the day it expires. Renewing
// a card (a new expiry date) re-plans it; nothing is planned past the expiry day.
export function planReminders(
  cards: ReadonlyArray<Pick<Card, 'id' | 'name' | 'tags' | 'expiresOn' | 'remindDaysBefore'> & { personId?: string | null; profile?: Card['profile'] }>,
  now: Date,
  max: number = MAX_SCHEDULED_REMINDERS,
  people: readonly Person[] = [],
): PlannedReminder[] {
  const planned: PlannedReminder[] = [];
  for (const card of cards) {
    if (card.profile) continue;
    const expiry = card.expiresOn ? parseIsoDate(card.expiresOn) : null;
    if (!expiry) continue;
    const owner = people.find((person) => person.id === card.personId);
    for (let daysBefore = card.remindDaysBefore; daysBefore >= 0; daysBefore--) {
      const fireAt = new Date(expiry.year, expiry.month - 1, expiry.day - daysBefore, REMINDER_HOUR, 0, 0, 0);
      if (fireAt.getTime() <= now.getTime()) continue;
      planned.push({
        id: `${card.id}:${daysBefore}`,
        cardId: card.id,
        daysBefore,
        fireAt,
        title: strings.reminders.title(owner ? strings.people.ownedDocument(owner.name, displayName(card)) : displayName(card), daysBefore),
        body: strings.reminders.body,
      });
    }
  }
  // iOS holds only so many; the rest are scheduled by a later sync (every launch and every change).
  return planned.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime()).slice(0, max);
}

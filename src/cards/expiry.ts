import { DAY_MS, EXPIRY_SOON_DAYS } from '../config';
import { strings } from '../strings';
import { fromIsoDate, toIsoDate } from '../time/dates';
import { Card } from './types';

export type ExpiryStatus =
  | { kind: 'none' }
  | { kind: 'expired'; days: number } // days since the last valid day
  | { kind: 'today' }
  | { kind: 'soon'; days: number } // within EXPIRY_SOON_DAYS, when the first reminder fires
  | { kind: 'later'; days: number };

// Counted in calendar days, so a card expiring tomorrow is "1 day" whatever the time now.
export function expiryStatus(card: Pick<Card, 'expiresOn'>, now: Date): ExpiryStatus {
  if (!card.expiresOn) return { kind: 'none' };
  const today = fromIsoDate(toIsoDate(now));
  // Rounded: a daylight-saving change makes a calendar day 23 or 25 hours long.
  const days = Math.round((fromIsoDate(card.expiresOn).getTime() - today.getTime()) / DAY_MS);
  if (days < 0) return { kind: 'expired', days: -days };
  if (days === 0) return { kind: 'today' };
  return { kind: days <= EXPIRY_SOON_DAYS ? 'soon' : 'later', days };
}

export function expiryLabel(card: Pick<Card, 'expiresOn'>, now: Date): string {
  const status = expiryStatus(card, now);
  switch (status.kind) {
    case 'none':
      return strings.card.noExpiry;
    case 'expired':
      return strings.card.expired(status.days);
    case 'today':
      return strings.card.expiresToday;
    case 'soon':
      return strings.card.expiresIn(status.days);
    case 'later':
      return strings.card.expiresOn(
        fromIsoDate(card.expiresOn as string).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      );
  }
}

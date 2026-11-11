import { requireOptionalNativeModule } from 'expo';
import { displayName } from '../cards/display';
import { expiryStatus } from '../cards/expiry';
import { sortCards, splitPinned } from '../cards/listing';
import { Card } from '../cards/types';
import { strings } from '../strings';
import { formatDate, fromIsoDate } from '../time/dates';

// The Android home screen widget (modules/home-widget). On iOS, and in builds before it, nothing.
const native = requireOptionalNativeModule<{ update(json: string): void }>('HomeWidget');

// As many as the widget has rows.
export const MAX_WIDGET_CARDS = 4;

export interface WidgetCard {
  id: string;
  name: string;
  note: string; // the first tag ('' without one), or the expiry date once it's close
  warn: boolean; // expired or due soon: the note is shown in the danger colour
}

export interface WidgetState {
  locked: boolean;
  cards: WidgetCard[];
}

// The pinned cards, as the app icon's shortcuts show them. With app lock on, nothing about any card:
// the widget is on the home screen for anyone holding the phone to see. Dates are written out, not
// counted down, as the widget only changes when the app next runs.
export function planWidget(cards: Card[], appLock: boolean, now: Date): WidgetState {
  if (appLock) return { locked: true, cards: [] };
  return {
    locked: false,
    cards: splitPinned(sortCards(cards))
      .pinned.slice(0, MAX_WIDGET_CARDS)
      .map((card) => {
        const kind = expiryStatus(card, now).kind;
        const warn = kind === 'expired' || kind === 'today' || kind === 'soon';
        const date = card.expiresOn ? formatDate(fromIsoDate(card.expiresOn).getTime()) : '';
        const note = !warn ? (card.tags[0] ?? '') : kind === 'expired' ? strings.widget.expired(date) : strings.card.expiresOn(date);
        return { id: card.id, name: displayName(card), note, warn };
      }),
  };
}

export function syncWidget(cards: Card[], appLock: boolean): void {
  native?.update(JSON.stringify(planWidget(cards, appLock, new Date())));
}

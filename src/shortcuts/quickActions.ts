import * as QuickActions from 'expo-quick-actions';
import { displayName } from '../cards/display';
import { splitPinned } from '../cards/listing';
import { Card } from '../cards/types';
import { MAX_CARD_SHORTCUTS } from '../config';
import { strings } from '../strings';

// Long-press the app icon: the first pinned cards, then Add card. Only pinned cards, since the user
// chose to put those on show; the menu shows their names while the phone is unlocked.
export function planShortcuts(cards: Card[]): QuickActions.Action[] {
  const pinned = splitPinned(cards).pinned.slice(0, MAX_CARD_SHORTCUTS);
  return [
    ...pinned.map((card) => ({
      id: `card:${card.id}`,
      title: displayName(card),
      icon: 'symbol:creditcard',
      params: { href: `/card/${card.id}` },
    })),
    { id: 'add', title: strings.home.addCard, icon: 'add', params: { href: '/edit/new' } },
  ];
}

export async function syncShortcuts(cards: Card[]): Promise<void> {
  await QuickActions.setItems(planShortcuts(cards));
}

// Where a launch shortcut leads, or null for anything else.
export function shortcutHref(action: QuickActions.Action | null | undefined): string | null {
  const href = action?.params?.href;
  return typeof href === 'string' && (href === '/edit/new' || /^\/card\/[A-Za-z0-9_-]+$/.test(href)) ? href : null;
}

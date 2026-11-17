import * as QuickActions from 'expo-quick-actions';
import { displayName } from '../cards/display';
import { sortCards, splitPinned } from '../cards/listing';
import { Card } from '../cards/types';
import { MAX_CARD_SHORTCUTS } from '../config';
import { strings } from '../strings';

// Reserve room for both creation actions. iOS has four slots; Android's launcher supplies its limit.
// Only pinned documents expose their names in the launcher, as in the existing pinned menu.
export function planShortcuts(cards: Card[]): QuickActions.Action[] {
  const capacity = QuickActions.maxCount ?? 4;
  const pinned = splitPinned(sortCards(cards)).pinned.slice(0, Math.max(0, Math.min(MAX_CARD_SHORTCUTS, capacity - 2)));
  return [
    { id: 'note', title: strings.notes.newTitle, icon: 'compose', params: { href: '/note/new' } },
    ...pinned.map((card) => ({
      id: `card:${card.id}`,
      title: strings.shortcuts.show(displayName(card)),
      icon: 'symbol:creditcard',
      params: { href: `/card/${card.id}?show=1` },
    })),
    { id: 'add', title: strings.home.addCard, icon: 'add', params: { href: '/edit/new' } },
  ].slice(0, capacity);
}

export async function syncShortcuts(cards: Card[]): Promise<void> {
  await QuickActions.setItems(planShortcuts(cards));
}

// Where a launch shortcut leads, or null for anything else.
export function shortcutHref(action: QuickActions.Action | null | undefined): string | null {
  const href = action?.params?.href;
  return typeof href === 'string' &&
    (href === '/edit/new' || href === '/note/new' || /^\/card\/[A-Za-z0-9_-]+(?:\?show=1)?$/.test(href))
    ? href
    : null;
}

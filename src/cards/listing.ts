import { displayName } from './display';
import { Card, Category } from './types';

const byName = (a: Card, b: Card) =>
  displayName(a).localeCompare(displayName(b), 'en', { sensitivity: 'base' }) || a.id.localeCompare(b.id);

export function sortCards(cards: Card[]): Card[] {
  const pinned = cards.filter((c) => c.pinned).sort((a, b) => a.position - b.position || byName(a, b));
  const others = cards.filter((c) => !c.pinned).sort(byName);
  return [...pinned, ...others];
}

export function splitPinned(sorted: Card[]): { pinned: Card[]; others: Card[] } {
  return { pinned: sorted.filter((c) => c.pinned), others: sorted.filter((c) => !c.pinned) };
}

// folderId: only that folder's cards; null or left out shows every card.
export function filterCards(
  cards: Card[],
  filter: { query: string; category: Category | null; folderId?: string | null },
): Card[] {
  const query = filter.query.trim().toLowerCase();
  return cards.filter((card) => {
    if (filter.category && card.category !== filter.category) return false;
    if (filter.folderId && card.folderId !== filter.folderId) return false;
    if (query === '') return true;
    return displayName(card).toLowerCase().includes(query) || card.tags.some((t) => t.toLowerCase().includes(query));
  });
}

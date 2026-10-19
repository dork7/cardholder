import { Card, Category } from './types';

const byName = (a: Card, b: Card) =>
  a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }) || a.id.localeCompare(b.id);

export function sortCards(cards: Card[]): Card[] {
  const pinned = cards.filter((c) => c.pinned).sort((a, b) => a.position - b.position || byName(a, b));
  const others = cards.filter((c) => !c.pinned).sort(byName);
  return [...pinned, ...others];
}

export function splitPinned(sorted: Card[]): { pinned: Card[]; others: Card[] } {
  return { pinned: sorted.filter((c) => c.pinned), others: sorted.filter((c) => !c.pinned) };
}

const compact = (s: string) => s.toLowerCase().replace(/\s+/g, '');

export function filterCards(cards: Card[], filter: { query: string; category: Category | null }): Card[] {
  const query = filter.query.trim().toLowerCase();
  return cards.filter((card) => {
    if (filter.category && card.category !== filter.category) return false;
    if (query === '') return true;
    return card.name.toLowerCase().includes(query) || compact(card.number ?? '').includes(compact(query));
  });
}

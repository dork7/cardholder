import { displayName } from './display';
import { expiryStatus } from './expiry';
import { Card, CardCategory } from './types';

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
  filter: { query: string; category: CardCategory | null; folderId?: string | null },
): Card[] {
  const query = filter.query.trim().toLowerCase();
  return cards.filter((card) => {
    if (filter.category && card.category !== filter.category) return false;
    if (filter.folderId && card.folderId !== filter.folderId) return false;
    if (query === '') return true;
    return displayName(card).toLowerCase().includes(query);
  });
}

// How the gallery orders cards. "expiry" puts the soonest (or already expired) first and cards with no
// date last; "added" puts the newest first. Ties fall back to the name.
export const GALLERY_SORTS = ['name', 'expiry', 'added'] as const;
export type GallerySort = (typeof GALLERY_SORTS)[number];

export const isGallerySort = (v: unknown): v is GallerySort => (GALLERY_SORTS as readonly unknown[]).includes(v);

export function sortForGallery(cards: Card[], sort: GallerySort): Card[] {
  const by =
    sort === 'expiry'
      ? (a: Card, b: Card) =>
          a.expiresOn === b.expiresOn
            ? byName(a, b)
            : a.expiresOn === null
              ? 1
              : b.expiresOn === null
                ? -1
                : a.expiresOn.localeCompare(b.expiresOn)
      : sort === 'added'
        ? (a: Card, b: Card) => b.createdAt - a.createdAt || byName(a, b)
        : byName;
  return [...cards].sort(by);
}

// Expired, or due within the reminder window: the cards worth renewing now.
export function isExpiringSoon(card: Card, now: Date): boolean {
  const kind = expiryStatus(card, now).kind;
  return kind === 'expired' || kind === 'today' || kind === 'soon';
}

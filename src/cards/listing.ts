import { displayName } from './display';
import { expiryStatus } from './expiry';
import { hasTag } from './tags';
import { Card } from './types';

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
  filter: { query: string; tag: string | null; folderId?: string | null },
): Card[] {
  const query = filter.query.trim().toLowerCase();
  const compactQuery = compact(query);
  return cards.filter((card) => {
    if (filter.tag && !hasTag(card, filter.tag)) return false;
    if (filter.folderId && card.folderId !== filter.folderId) return false;
    if (query === '') return true;
    if (displayName(card).toLowerCase().includes(query)) return true;
    // Then what's printed on the card, e.g. the insurer or a policy number.
    const text = card.readText ? `${card.readText.front}\n${card.readText.back}`.toLowerCase() : '';
    if (text.includes(query)) return true;
    // Numbers are written with spaces or dashes in different places; compare them without.
    return compactQuery.length >= MIN_COMPACT_QUERY && compact(text).includes(compactQuery);
  });
}

// Letters and digits only, so "784-1990-1234567" and "7841990 1234567" compare equal.
const compact = (s: string) => s.replace(/[^\p{L}\p{N}]/gu, '');
// Shorter compacted queries would match by accident inside long numbers.
const MIN_COMPACT_QUERY = 4;

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

import { MAX_TAGS } from '../config';
import { CardStore } from './cardStore';
import { hasTag, normalizeTags, sameTag } from './tags';
import { Card, CardFields } from './types';

// Actions on several cards picked in the gallery. Each card is done on its own, so one failure doesn't
// stop the rest; the result is how many failed.

export const fieldsOf = (card: Card): CardFields => ({
  name: card.name,
  expiresOn: card.expiresOn,
  remindDaysBefore: card.remindDaysBefore,
  tags: card.tags,
  documentKey: card.documentKey,
  folderId: card.folderId,
  readText: card.readText,
  vertical: card.vertical,
  blurPreview: card.blurPreview,
});

async function each(cards: Card[], what: string, run: (card: Card) => Promise<unknown>): Promise<number> {
  let failed = 0;
  for (const card of cards) {
    try {
      await run(card);
    } catch (e) {
      console.warn(`${what} failed`, e);
      failed++;
    }
  }
  return failed;
}

// Pins them all, in the order given, after the cards already pinned; if every one is pinned already,
// unpins them instead. The gallery's Pin button does the same, so one press can be undone by another.
export const shouldUnpin = (cards: Card[]): boolean => cards.length > 0 && cards.every((c) => c.pinned);

export function togglePinned(store: CardStore, cards: Card[]): Promise<number> {
  const pin = !shouldUnpin(cards);
  return each(
    cards.filter((c) => c.pinned !== pin),
    'Pin',
    (card) => store.setPinned(card.id, pin),
  );
}

export function removeAll(store: CardStore, cards: Card[]): Promise<number> {
  return each(cards, 'Delete', (card) => store.remove(card.id));
}

// A card's tags with `tags` added after them; repeats, ignoring case, keep the spelling already there.
export const withTags = (card: Card, tags: readonly string[]): string[] => normalizeTags([...card.tags, ...tags]);

// The cards that would go over the limit if `tags` were added to them.
export const overTagLimit = (cards: Card[], tags: readonly string[]): Card[] =>
  cards.filter((c) => withTags(c, tags).length > MAX_TAGS);

// Adds the tags to each card; a card that already has them all is left alone.
export function addTags(store: CardStore, cards: Card[], tags: readonly string[]): Promise<number> {
  return each(
    cards.filter((c) => withTags(c, tags).length > c.tags.length),
    'Adding tags',
    (card) => store.update(card.id, { ...fieldsOf(card), tags: withTags(card, tags) }),
  );
}

// Takes one tag off one card, matching it ignoring case.
export function removeTag(store: CardStore, card: Card, tag: string): Promise<Card> {
  return store.update(card.id, { ...fieldsOf(card), tags: card.tags.filter((t) => !sameTag(t, tag)) });
}

// Takes one tag off every card that has it, which deletes the tag: a tag exists only while a card has it.
export function removeTagEverywhere(store: CardStore, cards: Card[], tag: string): Promise<number> {
  return each(
    cards.filter((c) => hasTag(c, tag)),
    'Removing the tag',
    (card) => removeTag(store, card, tag),
  );
}

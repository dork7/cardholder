import { CardStore } from './cardStore';
import { Card, CardCategory, CardFields } from './types';

// Actions on several cards picked in the gallery. Each card is done on its own, so one failure doesn't
// stop the rest; the result is how many failed.

const fieldsOf = (card: Card): CardFields => ({
  name: card.name,
  category: card.category,
  expiresOn: card.expiresOn,
  tags: card.tags,
  documentKey: card.documentKey,
  folderId: card.folderId,
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

export function moveToCategory(store: CardStore, cards: Card[], category: CardCategory): Promise<number> {
  return each(
    cards.filter((c) => c.category !== category),
    'Changing the category',
    (card) => store.update(card.id, { ...fieldsOf(card), category }),
  );
}

export function removeAll(store: CardStore, cards: Card[]): Promise<number> {
  return each(cards, 'Delete', (card) => store.remove(card.id));
}

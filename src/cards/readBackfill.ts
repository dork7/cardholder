import { fieldsOf } from './batch';
import { CardStore } from './cardStore';
import { Card } from './types';

// `read` turns a photo into its text ('' when nothing is found).
export type ReadPhoto = (jpegBase64: string) => Promise<string>;

// Reads a card's text again from its saved photos (the cover page and second page, for a PDF) and
// saves it, which is what its Details (.md) are made from. Returns false when the card was edited or
// deleted while it was being read: the user's change wins, nothing is written.
export async function rereadCard(store: CardStore, card: Card, read: ReadPhoto): Promise<boolean> {
  const front = await store.loadImage(card.id, 'front');
  const back = card.hasBack ? await store.loadImage(card.id, 'back') : null;
  const readText = { front: front ? await read(front) : '', back: back ? await read(back) : '' };
  const fresh = await store.get(card.id);
  if (!fresh || fresh.updatedAt !== card.updatedAt) return false;
  await store.update(card.id, { ...fieldsOf(fresh), readText });
  return true;
}

// "Recreate .md" on several documents picked in the gallery: each is read on its own, so one failure
// doesn't stop the rest. Returns how many failed.
export async function rereadCards(
  store: CardStore,
  cards: readonly Card[],
  read: ReadPhoto,
  onEach?: (done: number) => void,
): Promise<number> {
  let failed = 0;
  for (const [i, card] of cards.entries()) {
    try {
      if (!(await rereadCard(store, card, read))) failed++;
    } catch (e) {
      console.warn('Reading a document again failed', e);
      failed++;
    }
    onEach?.(i + 1);
  }
  return failed;
}

// Cards saved before Doc Keeper kept the text read off them can't be found by it. Each is read once,
// in the background after the app opens, from its saved photos. Returns how many cards were updated.
export async function readUnreadCards(store: CardStore, read: ReadPhoto): Promise<number> {
  let updated = 0;
  for (const card of await store.list()) {
    if (card.readText !== null) continue;
    try {
      // Reading takes a while; if the user edited the card meanwhile, leave it for the next launch
      // rather than write over their change.
      if (await rereadCard(store, card, read)) updated++;
    } catch (e) {
      console.warn('Reading a saved card failed', e);
    }
  }
  return updated;
}

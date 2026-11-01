import { fieldsOf } from './batch';
import { CardStore } from './cardStore';

// Cards saved before Doc Keeper kept the text read off them can't be found by it. Each is read once,
// in the background after the app opens, from its saved photos. `read` turns a photo into its text
// ('' when nothing is found). Returns how many cards were updated.
export async function readUnreadCards(store: CardStore, read: (jpegBase64: string) => Promise<string>): Promise<number> {
  let updated = 0;
  for (const card of await store.list()) {
    if (card.readText !== null) continue;
    try {
      const front = await store.loadImage(card.id, 'front');
      const back = card.hasBack ? await store.loadImage(card.id, 'back') : null;
      const readText = { front: front ? await read(front) : '', back: back ? await read(back) : '' };
      // Reading takes a while; if the user edited the card meanwhile, leave it for the next launch
      // rather than write over their change.
      const fresh = await store.get(card.id);
      if (!fresh || fresh.updatedAt !== card.updatedAt || fresh.readText !== null) continue;
      await store.update(card.id, { ...fieldsOf(fresh), readText });
      updated++;
    } catch (e) {
      console.warn('Reading a saved card failed', e);
    }
  }
  return updated;
}

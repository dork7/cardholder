import { CardStore, StoredLookup } from '../cards/cardStore';
import { Card } from '../cards/types';
import { buildLookup, lookupIsStale } from './lookup';

// Makes the lookup file from the documents as they are now, and saves it (sealed).
export function recreateLookup(store: CardStore, cards: readonly Card[], now = new Date()): Promise<StoredLookup> {
  return store.saveLookup(buildLookup(cards, now), cards.map((c) => c.id));
}

// The lookup file to ask with: the saved one, or a fresh one if there is none yet or the documents
// changed since it was made (`remade` says so, and the Ask window tells the user).
export async function lookupForAsking(store: CardStore, cards: readonly Card[]): Promise<{ lookup: StoredLookup; remade: boolean }> {
  const saved = await store.loadLookup();
  if (saved && !lookupIsStale(saved, cards)) return { lookup: saved, remade: false };
  return { lookup: await recreateLookup(store, cards), remade: saved !== null };
}

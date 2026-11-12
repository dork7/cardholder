import { hasTag } from './tags';
import { Card, CardFields } from './types';

// A new card that looks like one already saved, e.g. a renewed Emirates ID. The document's own number
// is the strong sign; without one, the same name on a card that shares a tag is (or, for an untagged
// card, on another untagged one). Unnamed cards never match
// by name: "no name" says nothing about which card it is.
export function findDuplicate(fields: CardFields, cards: readonly Card[]): Card | null {
  if (fields.documentKey) {
    const byDocument = cards.find((c) => c.documentKey === fields.documentKey);
    if (byDocument) return byDocument;
  }
  const name = fields.name.trim().toLocaleLowerCase();
  if (name === '') return null;
  const sameGroup = (c: Card) => (fields.tags.length === 0 ? c.tags.length === 0 : fields.tags.some((t) => hasTag(c, t)));
  return cards.find((c) => sameGroup(c) && c.name.trim().toLocaleLowerCase() === name) ?? null;
}

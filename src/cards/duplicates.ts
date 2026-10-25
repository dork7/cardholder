import { Card, CardFields } from './types';

// A new card that looks like one already saved, e.g. a renewed Emirates ID. The document's own number
// is the strong sign; without one, the same name in the same category is. Unnamed cards never match
// by name: "no name" says nothing about which card it is.
export function findDuplicate(fields: CardFields, cards: readonly Card[]): Card | null {
  if (fields.documentKey) {
    const byDocument = cards.find((c) => c.documentKey === fields.documentKey);
    if (byDocument) return byDocument;
  }
  const name = fields.name.trim().toLocaleLowerCase();
  if (name === '') return null;
  return cards.find((c) => c.category === fields.category && c.name.trim().toLocaleLowerCase() === name) ?? null;
}

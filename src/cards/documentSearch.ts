import { displayName } from './display';
import { cardMarkdown } from './cardMarkdown';
import { Card, Folder } from './types';

const compact = (text: string) => text.replace(/[^\p{L}\p{N}]/gu, '');

function matches(text: string, query: string): boolean {
  const haystack = text.toLowerCase();
  const words = query.trim().toLowerCase().split(/\s+/);
  if (words.length === 0 || words[0] === '') return true;
  const compactText = compact(haystack);
  return words.every((word) =>
    haystack.includes(word) || (compact(word).length >= 4 && compactText.includes(compact(word))),
  );
}

// The title phase is immediate, so the list responds as the person types.
export function searchDocumentTitles(cards: readonly Card[], query: string): Card[] {
  return cards.filter((card) => matches(displayName(card), query));
}

// Details (.md) are generated from encrypted records, not persisted as readable files. Search the
// same Markdown shown on the document screen, and leave title matches to the first phase.
export async function searchDocumentDetails(
  cards: readonly Card[], folders: readonly Folder[], query: string, titleIds: ReadonlySet<string>,
): Promise<Card[]> {
  await Promise.resolve();
  return cards.filter((card) => !titleIds.has(card.id) && matches(cardMarkdown(card, folders), query));
}

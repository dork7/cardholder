import { useEffect, useMemo, useState } from 'react';
import { searchDocumentDetails, searchDocumentTitles } from './documentSearch';
import { Card, Folder } from './types';

export const DETAIL_SEARCH_DEBOUNCE_MS = 500;

// Show title matches immediately; add matches from each document's Details (.md) after typing pauses.
export function useDocumentSearch(cards: readonly Card[], folders: readonly Folder[], query: string): Card[] {
  const titles = useMemo(() => searchDocumentTitles(cards, query), [cards, query]);
  const [details, setDetails] = useState<{
    query: string; sourceCards: readonly Card[]; sourceFolders: readonly Folder[]; cards: Card[];
  } | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setDetails(null);
      return;
    }
    let active = true;
    setDetails(null);
    const titleIds = new Set(titles.map((card) => card.id));
    const timer = setTimeout(() => {
      void searchDocumentDetails(cards, folders, query, titleIds).then((matches) => {
        if (active) setDetails({ query, sourceCards: cards, sourceFolders: folders, cards: matches });
      });
    }, DETAIL_SEARCH_DEBOUNCE_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [cards, folders, query, titles]);

  if (!query.trim()) return [...cards];
  return details?.query === query && details.sourceCards === cards && details.sourceFolders === folders
    ? [...titles, ...details.cards] : titles;
}

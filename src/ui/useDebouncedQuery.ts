import { useEffect, useState } from 'react';

export const SEARCH_DEBOUNCE_MS = 250;

// Clearing is immediate; other edits wait for typing to pause.
export function useDebouncedQuery(query: string): string {
  const [settled, setSettled] = useState('');
  useEffect(() => {
    if (!query.trim()) {
      setSettled('');
      return;
    }
    const timer = setTimeout(() => setSettled(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);
  return query.trim() ? settled : '';
}

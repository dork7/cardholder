import { strings } from '../strings';
import { Card } from './types';

// The name is optional; a card without one goes by its first tag, or failing that a plain word.
export function displayName(card: Pick<Card, 'name' | 'tags'>): string {
  return card.name || card.tags[0] || strings.card.unnamed;
}

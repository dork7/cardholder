import { strings } from '../strings';
import { Card } from './types';

// The name is optional; a card without one goes by its category.
export function displayName(card: Pick<Card, 'name' | 'category'>): string {
  return card.name || strings.categories[card.category];
}

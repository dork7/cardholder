import { Card } from '../src/cards/types';

export function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'card1',
    name: 'Gym',
    category: 'membership',
    number: null,
    notes: null,
    expiresOn: null,
    pinned: true,
    position: 0,
    hasBack: false,
    frontAspect: 1.586,
    backAspect: null,
    createdAt: 1_000,
    updatedAt: 1_000,
    ...overrides,
  };
}

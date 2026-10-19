import { FREE_CARD_LIMIT } from '../config';

// Gates adding only. Existing cards are never locked, even above the limit.
export function canAddCard(cardCount: number, unlocked: boolean): boolean {
  return unlocked || cardCount < FREE_CARD_LIMIT;
}

import { CARD_LIMIT_ENABLED, FREE_CARD_LIMIT } from '../config';

// Gates adding only. Existing cards are never locked, even above the limit.
export function canAddCard(cardCount: number, unlocked: boolean, limitEnabled = CARD_LIMIT_ENABLED): boolean {
  return !limitEnabled || unlocked || cardCount < FREE_CARD_LIMIT;
}

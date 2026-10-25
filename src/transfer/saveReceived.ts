import { CardStore } from '../cards/cardStore';
import { findDuplicate } from '../cards/duplicates';
import { Card } from '../cards/types';
import { canAddCard } from '../purchases/limits';
import { CardTransferContent } from './cardMessage';
import { withThumbnail } from './images';

export type SaveReceivedResult =
  | { kind: 'saved'; card: Card }
  | { kind: 'cancelled' }
  | { kind: 'limit-reached' };

// Saves a received card like a new one: a card that looks like one already here offers Replace, and
// the free limit applies. It joins no folder (folders are this phone's own), unless it replaces a card
// that was in one.
export async function saveReceived(
  content: CardTransferContent,
  ctx: {
    store: CardStore;
    cards: Card[];
    unlocked: boolean;
    askReplace: (name: string) => Promise<'replace' | 'keep' | 'cancel'>;
    nameOf: (card: Card) => string;
  },
): Promise<SaveReceivedResult> {
  const fields = { ...content.fields, folderId: null };
  const duplicate = findDuplicate(fields, ctx.cards);
  const choice = duplicate ? await ctx.askReplace(ctx.nameOf(duplicate)) : 'keep';
  if (choice === 'cancel') return { kind: 'cancelled' };

  const front = await withThumbnail(content.front);
  if (duplicate && choice === 'replace') {
    const card = await ctx.store.update(duplicate.id, { ...fields, folderId: duplicate.folderId }, { front, back: content.back });
    return { kind: 'saved', card };
  }
  if (!canAddCard(ctx.cards.length, ctx.unlocked)) return { kind: 'limit-reached' };
  return { kind: 'saved', card: await ctx.store.create(fields, { front, back: content.back }) };
}

import { Undo } from '../app/undo';
import { strings } from '../strings';
import { CardStore } from './cardStore';
import { displayName } from './display';
import { Card } from './types';

// Deletes one card at once — it goes to Recently deleted — and offers Undo, which restores it with
// everything it had. Rejects, offering nothing, when the delete itself fails. A failed refresh only
// leaves the list stale until the next one.
export async function deleteWithUndo(
  store: Pick<CardStore, 'moveToRecentlyDeleted' | 'restore'>,
  undo: Pick<Undo, 'offer'>,
  card: Card,
  refresh: () => Promise<void>,
): Promise<void> {
  await store.moveToRecentlyDeleted(card.id);
  undo.offer({
    message: strings.undo.deleted(displayName(card)),
    undo: async () => {
      await store.restore(card.id);
      await refresh().catch((e) => console.warn('Refresh after undo failed', e));
    },
  });
  await refresh().catch((e) => console.warn('Refresh after delete failed', e));
}

// Deletes a gallery selection at once — each document goes to Recently deleted on its own, so one
// failure doesn't stop the rest — and offers one Undo for every document that went. Resolves to how
// many couldn't be deleted; when none went, nothing is offered. Undo restores them all, then rejects
// if any couldn't be restored (they stay in Recently deleted).
export async function deleteAllWithUndo(
  store: Pick<CardStore, 'moveToRecentlyDeleted' | 'restore'>,
  undo: Pick<Undo, 'offer'>,
  cards: Card[],
  refresh: () => Promise<void>,
): Promise<number> {
  const deleted: Card[] = [];
  for (const card of cards) {
    try {
      await store.moveToRecentlyDeleted(card.id);
      deleted.push(card);
    } catch (e) {
      console.warn('Delete failed', e);
    }
  }
  if (deleted.length > 0) {
    undo.offer({
      message: deleted.length === 1 ? strings.undo.deleted(displayName(deleted[0])) : strings.undo.deletedMany(deleted.length),
      undo: async () => {
        const results = await Promise.allSettled(deleted.map((card) => store.restore(card.id)));
        await refresh().catch((e) => console.warn('Refresh after undo failed', e));
        const failed = results.filter((r) => r.status === 'rejected').length;
        if (failed > 0) throw new Error(`${failed} of ${deleted.length} documents couldn't be restored`);
      },
    });
  }
  await refresh().catch((e) => console.warn('Refresh after delete failed', e));
  return cards.length - deleted.length;
}

import { Undo } from '../app/undo';
import { strings } from '../strings';
import { CardStore } from './cardStore';
import { displayName } from './display';
import { refreshAfter } from './refreshAfter';
import { Card } from './types';

type Store = Pick<CardStore, 'moveToRecentlyDeleted' | 'restore'>;

// Deletes one document at once — it goes to Recently deleted — and offers Undo, which restores it with
// everything it had. Rejects with the delete's own error, offering nothing, when the delete fails.
export async function deleteWithUndo(store: Store, undo: Pick<Undo, 'offer'>, card: Card, refresh: () => Promise<void>): Promise<void> {
  const [error] = await deleteEachWithUndo(store, undo, [card], refresh);
  if (error !== undefined) throw error;
}

// Deletes a document selection at once — each document goes to Recently deleted on its own, so one
// failure doesn't stop the rest — and offers one Undo for every document that went. Resolves to how
// many couldn't be deleted; when none went, nothing is offered. Undo restores them all, then rejects
// if any couldn't be restored (they stay in Recently deleted).
export async function deleteAllWithUndo(
  store: Store,
  undo: Pick<Undo, 'offer'>,
  cards: Card[],
  refresh: () => Promise<void>,
): Promise<number> {
  return (await deleteEachWithUndo(store, undo, cards, refresh)).length;
}

// Resolves to the error of each document that couldn't be deleted.
async function deleteEachWithUndo(
  store: Store,
  undo: Pick<Undo, 'offer'>,
  cards: Card[],
  refresh: () => Promise<void>,
): Promise<unknown[]> {
  const deleted: Card[] = [];
  const errors: unknown[] = [];
  for (const card of cards) {
    try {
      await store.moveToRecentlyDeleted(card.id);
      deleted.push(card);
    } catch (e) {
      console.warn('Delete failed', e);
      errors.push(e);
    }
  }
  if (deleted.length > 0) {
    undo.offer({
      message: deleted.length === 1 ? strings.undo.deleted(displayName(deleted[0])) : strings.undo.deletedMany(deleted.length),
      undo: async () => {
        let failed = 0;
        // Each restore opens a transaction on the same SQLite connection.
        for (const card of deleted) {
          try {
            await store.restore(card.id);
          } catch {
            failed += 1;
          }
        }
        await refreshAfter(refresh, 'undo');
        if (failed > 0) throw new Error(`${failed} of ${deleted.length} documents couldn't be restored`);
      },
    });
    await refreshAfter(refresh, 'delete');
  }
  return errors;
}

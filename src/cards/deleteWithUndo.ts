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

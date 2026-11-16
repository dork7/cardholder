import { Undo } from '../app/undo';
import { strings } from '../strings';
import { fieldsOf, removeTag } from './batch';
import { CardStore } from './cardStore';
import { hasTag, sameTag } from './tags';
import { Card } from './types';

// Takes one tag off a card at once and offers Undo, which puts it back where it was. Undo works on the
// card as it is by then, so tags added or removed meanwhile are kept. Rejects, offering nothing, when
// the removal itself fails. A failed refresh only leaves the screen stale until the next one.
export async function removeTagWithUndo(
  store: Pick<CardStore, 'update' | 'get'>,
  undo: Pick<Undo, 'offer'>,
  card: Card,
  tag: string,
  refresh: () => Promise<void>,
): Promise<void> {
  const at = card.tags.findIndex((t) => sameTag(t, tag));
  await removeTag(store, card, tag);
  undo.offer({
    message: strings.undo.removedTag(tag),
    undo: async () => {
      const now = await store.get(card.id);
      if (now && !hasTag(now, tag)) {
        const tags = [...now.tags];
        tags.splice(Math.max(0, Math.min(at, tags.length)), 0, tag);
        await store.update(card.id, { ...fieldsOf(now), tags });
      }
      await refresh().catch((e) => console.warn('Refresh after undo failed', e));
    },
  });
  await refresh().catch((e) => console.warn('Refresh after removing a tag failed', e));
}

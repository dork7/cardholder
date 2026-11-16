import { Undo } from '../app/undo';
import { MAX_TAGS } from '../config';
import { strings } from '../strings';
import { fieldsOf, removeTag, TooManyTagsError } from './batch';
import { CardStore } from './cardStore';
import { refreshAfter } from './refreshAfter';
import { hasTag, sameTag } from './tags';
import { Card } from './types';

// Takes one tag off a document at once and offers Undo, which puts it back where it was. Undo works on
// the document as it is by then, so tags added or removed meanwhile are kept; when it has filled up to
// MAX_TAGS meanwhile, Undo leaves it alone and rejects with TooManyTagsError. Rejects, offering nothing,
// when the removal itself fails.
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
    failure: 'undoTag',
    undo: async () => {
      const now = await store.get(card.id);
      if (now && !hasTag(now, tag)) {
        if (now.tags.length >= MAX_TAGS) throw new TooManyTagsError();
        const tags = [...now.tags];
        tags.splice(Math.max(0, Math.min(at, tags.length)), 0, tag);
        await store.update(card.id, { ...fieldsOf(now), tags });
      }
      await refreshAfter(refresh, 'undo');
    },
  });
  await refreshAfter(refresh, 'removing a tag');
}

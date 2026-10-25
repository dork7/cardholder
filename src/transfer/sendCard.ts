import { CardStore } from '../cards/cardStore';
import { Card } from '../cards/types';
import { engine } from '../crypto/engine';
import { encodeCardMessage } from './cardMessage';
import { createTransfer, Transfer } from './frames';
import { clearTransferCache, shrinkForTransfer } from './images';

// Loads, shrinks and packs a card for sending. Rejects if a photo can't be read.
export async function prepareTransfer(store: CardStore, card: Card): Promise<Transfer> {
  const [front, back] = await Promise.all([
    store.loadImage(card.id, 'front'),
    card.hasBack ? store.loadImage(card.id, 'back') : Promise.resolve(null),
  ]);
  if (!front) throw new Error('Front photo missing');
  try {
    const message = encodeCardMessage({
      fields: { name: card.name, category: card.category, expiresOn: card.expiresOn, tags: card.tags, documentKey: card.documentKey },
      front: await shrinkForTransfer({ jpegBase64: front, aspect: card.frontAspect }),
      back: back && card.backAspect ? await shrinkForTransfer({ jpegBase64: back, aspect: card.backAspect }) : null,
    });
    const id = new DataView(engine.randomBytes(4).buffer).getUint32(0);
    return createTransfer(message, id);
  } finally {
    clearTransferCache();
  }
}

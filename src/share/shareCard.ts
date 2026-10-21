import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { CardStore } from '../cards/cardStore';
import { displayName } from '../cards/display';
import { Card } from '../cards/types';
import { base64 } from '../crypto/bytes';

const shareDir = () => new Directory(Paths.cache, 'share');

// The share sheet needs a file on disk, so a decrypted copy lives here only while it is open.
export function clearShareCache(): void {
  const dir = shareDir();
  if (dir.exists) dir.delete();
}

// "Gym card!" -> "Gym card-front.jpg"; anything that could form a path is dropped.
export function cardImageFileName(card: Pick<Card, 'name' | 'category'>, side: 'front' | 'back'): string {
  const base = displayName(card).replace(/[^\p{L}\p{N} _-]/gu, '').trim() || 'card';
  return `${base}-${side}.jpg`;
}

// Shares the front photo. Resolves once the share sheet is closed.
export async function shareCardImage(store: CardStore, card: Card): Promise<void> {
  const front = await store.loadImage(card.id, 'front');
  if (!front) return;
  clearShareCache();
  const dir = shareDir();
  dir.create({ intermediates: true });
  const file = new File(dir, cardImageFileName(card, 'front'));
  file.create({ overwrite: true });
  await file.write(base64.decode(front));
  try {
    await Sharing.shareAsync(file.uri, { mimeType: 'image/jpeg', UTI: 'public.jpeg' });
  } finally {
    clearShareCache();
  }
}

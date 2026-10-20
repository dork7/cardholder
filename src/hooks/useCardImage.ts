import { useEffect, useState } from 'react';
import { useApp } from '../app/AppProvider';
import { Card, ImageSide } from '../cards/types';

// Only thumbnails are cached (small). Keyed on updatedAt so edits never show a stale picture.
const thumbCache = new Map<string, string>();

export const dataUri = (jpegBase64: string) => `data:image/jpeg;base64,${jpegBase64}`;

export function useCardImage(card: Card | undefined, side: ImageSide): string | null {
  const { services } = useApp();
  const key = card ? `${card.id}:${side}:${card.updatedAt}` : null;
  const [uri, setUri] = useState<string | null>(() => (key ? (thumbCache.get(key) ?? null) : null));

  useEffect(() => {
    if (!key || !card) {
      setUri(null);
      return;
    }
    const cached = thumbCache.get(key);
    if (cached) {
      setUri(cached);
      return;
    }
    let live = true;
    setUri(null);
    services.store
      .loadImage(card.id, side)
      .then((b64) => {
        const value = b64 ? dataUri(b64) : null;
        if (value && side === 'thumb') thumbCache.set(key, value);
        if (live) setUri(value);
      })
      .catch(() => {
        if (live) setUri(null);
      });
    return () => {
      live = false;
    };
    // card is fully described by key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, services]);

  return uri;
}

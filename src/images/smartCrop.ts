import { requireOptionalNativeModule } from 'expo';
import { OcrBox } from '../analysis/types';

interface CardDetector {
  detectCard?(uri: string): Promise<OcrBox | null>;
}

// Part of the card-ocr module: Vision on iOS, a small edge and line finder on Android. In builds made
// before it was added, no card is found and the crop starts from the whole photo, as before.
const native = requireOptionalNativeModule<CardDetector>('CardOcr');

export async function detectCardBounds(uri: string): Promise<OcrBox | null> {
  if (!native?.detectCard) return null;
  try {
    return await native.detectCard(uri);
  } catch (e) {
    console.warn('Card edge detection failed', e);
    return null;
  }
}

// Room around the detected card, as a share of its size: the crop can be pulled out a little if the
// edges were found slightly inside the card, which is the usual way detection misses.
export const CROP_MARGIN = 0.06;

// The detected box (0–1, top left) grown by the margin and turned into whole pixels inside the photo.
// Null when the result would be the whole photo anyway, or too small to be a real find.
export function cropRect(
  box: OcrBox,
  imageWidth: number,
  imageHeight: number,
  margin = CROP_MARGIN,
): { originX: number; originY: number; width: number; height: number } | null {
  const left = Math.max(0, box.x - box.width * margin);
  const top = Math.max(0, box.y - box.height * margin);
  const right = Math.min(1, box.x + box.width * (1 + margin));
  const bottom = Math.min(1, box.y + box.height * (1 + margin));
  if (right - left < 0.1 || bottom - top < 0.1) return null;
  if (right - left > 0.97 && bottom - top > 0.97) return null;
  const originX = Math.round(left * imageWidth);
  const originY = Math.round(top * imageHeight);
  return {
    originX,
    originY,
    width: Math.round(right * imageWidth) - originX,
    height: Math.round(bottom * imageHeight) - originY,
  };
}

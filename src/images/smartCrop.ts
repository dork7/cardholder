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

// A photo shaped like an ID card or passport page (short side 0.6–0.72 of the long side) is most
// likely already just the document: its outer edges are the photo's edges, which can't be found, so a
// small rectangle inside it is a part such as the portrait, not the card (#57).
const DOCUMENT_SHAPED = [0.6, 0.72] as const;
const MIN_FIND_IN_DOCUMENT_PHOTO = 0.3; // share of the photo's area

// The detected box (0–1, top left) grown by the margin and turned into whole pixels inside the photo.
// Null when the result would be the whole photo anyway, too small to be a real find, or a part of a
// photo that is already the document.
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
  const photoShape = Math.min(imageWidth, imageHeight) / Math.max(imageWidth, imageHeight);
  const documentPhoto = photoShape >= DOCUMENT_SHAPED[0] && photoShape <= DOCUMENT_SHAPED[1];
  if (documentPhoto && box.width * box.height < MIN_FIND_IN_DOCUMENT_PHOTO) return null;
  const originX = Math.round(left * imageWidth);
  const originY = Math.round(top * imageHeight);
  return {
    originX,
    originY,
    width: Math.round(right * imageWidth) - originX,
    height: Math.round(bottom * imageHeight) - originY,
  };
}

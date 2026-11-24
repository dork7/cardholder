import { File } from 'expo-file-system';
import { RefObject } from 'react';
import { captureRef } from 'react-native-view-shot';
import { FrontImage } from '../cards/types';
import { IMAGE_QUALITY } from '../config';
import { discardFile, makeThumbnail } from '../images/capture';
import { PROFILE_CARD_HEIGHT, PROFILE_CARD_WIDTH, ProfileCardView } from './ProfileCard';

// Captures the drawn profile card on screen as the document's front picture and thumbnail, so every
// list, favorite and share shows it without knowing about profiles. The plaintext capture is deleted
// before returning.
export async function drawCard(view: RefObject<ProfileCardView | null>): Promise<FrontImage> {
  if (!view.current) throw new Error('The profile card is not on screen');
  const height = await new Promise<number>((resolve) =>
    view.current!.measure((_x, _y, _width, measuredHeight) => resolve(measuredHeight || PROFILE_CARD_HEIGHT)));
  const uri = await captureRef(view, { format: 'jpg', quality: IMAGE_QUALITY, result: 'tmpfile' });
  try {
    return {
      jpegBase64: await new File(uri).base64(),
      aspect: PROFILE_CARD_WIDTH / height,
      thumbJpegBase64: await makeThumbnail(uri),
    };
  } finally {
    discardFile(uri);
  }
}

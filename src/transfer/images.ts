import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { CardImage, FrontImage } from '../cards/types';
import { THUMB_WIDTH, TRANSFER_MAX_EDGE, TRANSFER_QUALITY } from '../config';
import { base64 } from '../crypto/bytes';

const transferDir = () => new Directory(Paths.cache, 'transfer');

// The image tools read files, so a decrypted copy exists here only for the moment it takes.
export function clearTransferCache(): void {
  const dir = transferDir();
  if (dir.exists) dir.delete();
}

async function withTempJpeg<T>(jpegBase64: string, use: (uri: string) => Promise<T>): Promise<T> {
  const dir = transferDir();
  if (!dir.exists) dir.create({ intermediates: true });
  const file = new File(dir, `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`);
  file.create({ overwrite: true });
  await file.write(base64.decode(jpegBase64));
  try {
    return await use(file.uri);
  } finally {
    if (file.exists) file.delete();
  }
}

async function render(uri: string, resize: { width?: number; height?: number }, compress: number): Promise<string> {
  const image = await ImageManipulator.manipulate(uri).resize(resize).renderAsync();
  try {
    const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress, base64: true });
    new File(saved.uri).delete();
    if (!saved.base64) throw new Error('No image data');
    return saved.base64;
  } finally {
    image.release();
  }
}

// Every QR code carries under a kilobyte, so the photo travels smaller than it is stored: long edge
// TRANSFER_MAX_EDGE, still sharp enough to show at a counter.
export function shrinkForTransfer(image: CardImage): Promise<CardImage> {
  const resize = image.aspect >= 1 ? { width: TRANSFER_MAX_EDGE } : { height: TRANSFER_MAX_EDGE };
  return withTempJpeg(image.jpegBase64, async (uri) => ({
    jpegBase64: await render(uri, resize, TRANSFER_QUALITY),
    aspect: image.aspect,
  }));
}

// The thumbnail isn't sent; the receiving phone makes its own, as when a photo is added.
export function withThumbnail(front: CardImage): Promise<FrontImage> {
  return withTempJpeg(front.jpegBase64, async (uri) => ({
    ...front,
    thumbJpegBase64: await render(uri, { width: THUMB_WIDTH }, 0.7),
  }));
}

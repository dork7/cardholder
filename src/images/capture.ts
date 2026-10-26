import { requireOptionalNativeModule } from 'expo';
import { getDocumentAsync } from 'expo-document-picker';
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import ImagePicker, { Image as PickedImage } from 'react-native-image-crop-picker';
import { FrontImage } from '../cards/types';
import { IMAGE_MAX_EDGE, IMAGE_QUALITY, THUMB_WIDTH } from '../config';
import { cropRect, detectCardBounds } from './smartCrop';

// The library's `Options` is a photo|video|any union, which openCropper rejects; derive the photo-only type.
const CROP_OPTIONS: Omit<Parameters<typeof ImagePicker.openCropper>[0], 'path'> = {
  mediaType: 'photo',
  cropping: true,
  freeStyleCropEnabled: true,
  includeBase64: true,
  forceJpg: true,
  compressImageMaxWidth: IMAGE_MAX_EDGE,
  compressImageMaxHeight: IMAGE_MAX_EDGE,
  compressImageQuality: IMAGE_QUALITY,
};

const toFileUri = (path: string) => (path.startsWith('file://') ? path : `file://${path}`);

// Best effort; the OS also clears the cache folder.
export function discardFile(path: string): void {
  try {
    const f = new File(toFileUri(path));
    if (f.exists) f.delete();
  } catch {
    // ignore
  }
}

const isCancel = (e: unknown) => (e as { code?: string }).code === 'E_PICKER_CANCELLED';

// Photo library → freeform crop, starting around the card when its edges can be found. Returns null
// when the user cancels.
export async function pickImage(): Promise<FrontImage | null> {
  let picked: PickedImage;
  try {
    picked = (await ImagePicker.openPicker({ mediaType: 'photo', cropping: false, forceJpg: true })) as PickedImage;
  } catch (e) {
    if (isCancel(e)) return null;
    throw e;
  }
  try {
    return await cropSharedImage(picked.path);
  } finally {
    discardFile(picked.path);
  }
}

// A file shared into the app → the same freeform crop. The caller discards the shared file.
export async function cropSharedImage(path: string): Promise<FrontImage | null> {
  const uri = toFileUri(path);
  const precut = await cutAroundCard(uri);
  try {
    return await finish((await ImagePicker.openCropper({ ...CROP_OPTIONS, path: precut ?? uri })) as PickedImage);
  } catch (e) {
    if (isCancel(e)) return null;
    throw e;
  } finally {
    if (precut) discardFile(precut);
  }
}

// Smart crop: the cropper can't be told where to start, so it is handed the photo already cut to the
// card plus a margin. Any failure just means starting from the whole photo.
async function cutAroundCard(uri: string): Promise<string | null> {
  const bounds = await detectCardBounds(uri);
  if (!bounds) return null;
  // Full-size decoded photos are large: release them as soon as the cut is saved.
  const decoded: { release(): void }[] = [];
  try {
    const photo = await ImageManipulator.manipulate(uri).renderAsync();
    decoded.push(photo);
    const rect = cropRect(bounds, photo.width, photo.height);
    if (!rect) return null;
    const cut = await ImageManipulator.manipulate(photo).crop(rect).renderAsync();
    decoded.push(cut);
    // Full quality: the cropper compresses once more on the way out.
    return (await cut.saveAsync({ format: SaveFormat.JPEG, compress: 1 })).uri;
  } catch (e) {
    console.warn('Smart crop failed', e);
    return null;
  } finally {
    for (const ref of decoded) ref.release();
  }
}

interface CardPdfModule {
  renderPage(uri: string, page: number, maxEdge: number): Promise<{ uri: string; pageCount: number }>;
}

// modules/card-pdf; missing in builds made before it was added, which then hide the PDF option.
const cardPdf = requireOptionalNativeModule<CardPdfModule>('CardPdf');
export const canPickPdf = cardPdf !== null;

export const isPdfLocked = (e: unknown) => (e as { code?: string }).code === 'E_PDF_LOCKED';

// A PDF from Files → one page rendered → the same freeform crop. `page` is zero-based and clamped to
// the last page. Returns null when the user cancels. The picked copy and the rendered page are
// plaintext temp files, deleted before returning.
export async function pickPdfPage(page: number): Promise<FrontImage | null> {
  if (!cardPdf) throw new Error('PDF rendering is not available in this build');
  const picked = await getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
  if (picked.canceled) return null;
  const pdfUri = picked.assets[0].uri;
  try {
    // Twice the saved size, so cropping in to the card still leaves enough pixels.
    const rendered = await cardPdf.renderPage(pdfUri, page, IMAGE_MAX_EDGE * 2);
    try {
      return await cropSharedImage(rendered.uri);
    } finally {
      discardFile(rendered.uri);
    }
  } finally {
    discardFile(pdfUri);
  }
}

// Plaintext temp files (the crop output and the thumbnail) are deleted before returning.
async function finish(picked: PickedImage): Promise<FrontImage> {
  try {
    if (!picked.data) throw new Error('Picker returned no image data');
    return {
      jpegBase64: picked.data,
      aspect: picked.width / picked.height,
      thumbJpegBase64: await makeThumbnail(toFileUri(picked.path)),
    };
  } finally {
    discardFile(picked.path);
    await ImagePicker.clean().catch(() => {});
  }
}

async function makeThumbnail(uri: string): Promise<string> {
  const rendered = await ImageManipulator.manipulate(uri).resize({ width: THUMB_WIDTH }).renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  try {
    if (!saved.base64) throw new Error('No thumbnail data');
    return saved.base64;
  } finally {
    discardFile(saved.uri);
  }
}

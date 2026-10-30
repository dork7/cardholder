import { Directory, File, Paths } from 'expo-file-system';
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

// Uncut photos kept while the form is open, for "Use full photo". Plaintext card photos: each is
// deleted once it's no longer needed, and the folder is emptied whenever a form opens.
const originalsDir = () => new Directory(Paths.cache, 'originals');

export function clearOriginals(): void {
  try {
    const dir = originalsDir();
    if (dir.exists) dir.delete();
  } catch {
    // ignore
  }
}

export interface PickedPhoto {
  image: FrontImage;
  // When the crop started cut around the card: the whole photo, so the user can go back to it
  // (cropFullPhoto). The caller discards it (discardFile) when done. Null when the crop already
  // started from the whole photo.
  original: string | null;
}

// Photo library → freeform crop, starting around the card when its edges can be found. Returns null
// when the user cancels.
export async function pickImage(): Promise<PickedPhoto | null> {
  let picked: PickedImage;
  try {
    picked = (await ImagePicker.openPicker({ mediaType: 'photo', cropping: false, forceJpg: true })) as PickedImage;
  } catch (e) {
    if (isCancel(e)) return null;
    throw e;
  }
  let original: File | null = null;
  try {
    const uri = toFileUri(picked.path);
    const precut = await cutAroundCard(uri);
    if (precut) original = await keepOriginal(uri);
    const image = await crop(precut ?? uri, precut);
    if (!image) return null;
    const kept = original;
    original = null;
    return { image, original: kept?.uri ?? null };
  } finally {
    if (original) discardFile(original.uri);
    discardFile(picked.path);
  }
}

// A copy of our own: finishing the crop clears the picker's files. Without one, the photo is still
// added, just with no way back to the whole of it.
async function keepOriginal(uri: string): Promise<File | null> {
  try {
    originalsDir().create({ intermediates: true, idempotent: true });
    const copy = new File(originalsDir(), `${Date.now()}.jpg`);
    await new File(uri).copy(copy);
    return copy;
  } catch (e) {
    console.warn('Keeping the whole photo failed', e);
    return null;
  }
}

// The whole photo kept by pickImage → the same freeform crop, starting from all of it. Null when the
// user cancels; the original is kept either way, for the caller to discard.
export function cropFullPhoto(original: string): Promise<FrontImage | null> {
  return crop(original, null);
}

// A file shared into the app → the same freeform crop. The caller discards the shared file.
export async function cropSharedImage(path: string): Promise<FrontImage | null> {
  const uri = toFileUri(path);
  const precut = await cutAroundCard(uri);
  return crop(precut ?? uri, precut);
}

// Opens the cropper on `path`; `precut`, when given, is a temporary cut that is deleted afterwards.
async function crop(path: string, precut: string | null): Promise<FrontImage | null> {
  try {
    return await finish((await ImagePicker.openCropper({ ...CROP_OPTIONS, path })) as PickedImage);
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

export async function makeThumbnail(uri: string): Promise<string> {
  const rendered = await ImageManipulator.manipulate(uri).resize({ width: THUMB_WIDTH }).renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  try {
    if (!saved.base64) throw new Error('No thumbnail data');
    return saved.base64;
  } finally {
    discardFile(saved.uri);
  }
}

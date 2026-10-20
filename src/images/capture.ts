import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import ImagePicker, { Image as PickedImage } from 'react-native-image-crop-picker';
import { FrontImage } from '../cards/types';
import { IMAGE_MAX_EDGE, IMAGE_QUALITY, THUMB_WIDTH } from '../config';

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

// Photo library → freeform crop. Returns null when the user cancels.
export async function pickImage(): Promise<FrontImage | null> {
  try {
    return await finish((await ImagePicker.openPicker(CROP_OPTIONS)) as PickedImage);
  } catch (e) {
    if (isCancel(e)) return null;
    throw e;
  }
}

// A file shared into the app → the same freeform crop. The caller discards the shared file.
export async function cropSharedImage(path: string): Promise<FrontImage | null> {
  try {
    return await finish((await ImagePicker.openCropper({ ...CROP_OPTIONS, path: toFileUri(path) })) as PickedImage);
  } catch (e) {
    if (isCancel(e)) return null;
    throw e;
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

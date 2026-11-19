import { requireOptionalNativeModule } from 'expo';

export type PhotoProblem = 'blur' | 'glare' | 'cutoff';

export interface PhotoQualityMetrics {
  sharpness: number; // average absolute Laplacian in a downsampled image
  contrast: number; // grayscale standard deviation
  whiteRatio: number; // nearly white pixels
  clippedLines: number; // recognized text lines touching an image edge
}

interface QualityModule {
  measureQuality?(jpegBase64: string): Promise<PhotoQualityMetrics>;
}

const native = requireOptionalNativeModule<QualityModule>('CardOcr');

// Only very strong signals produce a warning. Blank and low-text documents can otherwise be valid.
export function photoQualityProblem(metrics: PhotoQualityMetrics): PhotoProblem | null {
  if (metrics.clippedLines >= 2) return 'cutoff';
  if (metrics.whiteRatio > 0.85 && metrics.contrast < 18) return 'glare';
  if (metrics.sharpness < 1.5 && metrics.contrast < 12) return 'blur';
  return null;
}

export async function checkPhotoQuality(jpegBase64: string): Promise<PhotoProblem | null> {
  if (!native?.measureQuality) return null; // Older builds and unsupported platforms do not block saving.
  try {
    return photoQualityProblem(await native.measureQuality(jpegBase64));
  } catch (e) {
    console.warn('Checking photo quality failed', e);
    return null;
  }
}

import { requireOptionalNativeModule } from 'expo';
import { OcrResult, TextRecognizer } from './types';

interface CardOcrModule {
  recognize(jpegBase64: string): Promise<OcrResult>;
}

// The module exists on iOS only for now (modules/card-ocr). Elsewhere, and in builds made before it
// was added, cards simply read as having no text, so the form gets no suggestions.
const native = requireOptionalNativeModule<CardOcrModule>('CardOcr');

export const cardTextRecognizer: TextRecognizer = {
  recognize: (jpegBase64) => (native ? native.recognize(jpegBase64) : Promise.resolve({ lines: [] })),
};

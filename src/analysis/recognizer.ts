import { requireOptionalNativeModule } from 'expo';
import { OcrResult, TextRecognizer } from './types';

interface CardOcrModule {
  recognize?(jpegBase64: string): Promise<OcrResult>;
}

// Text reading is iOS only for now (modules/card-ocr; on Android the module only finds card edges).
// Elsewhere, and in builds made before it was added, cards simply read as having no text, so the form
// gets no suggestions.
const native = requireOptionalNativeModule<CardOcrModule>('CardOcr');

// Whether this phone reads the text on cards at all. The AI model works on that text, so it is only
// offered where there is some.
export const canReadText = Boolean(native?.recognize);

export const cardTextRecognizer: TextRecognizer = {
  recognize: (jpegBase64) => (native?.recognize ? native.recognize(jpegBase64) : Promise.resolve({ lines: [] })),
};

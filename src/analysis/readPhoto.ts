import { toIsoDate } from '../time/dates';
import { analyzeText } from './analyze';
import { canReadText, cardTextRecognizer } from './recognizer';

export { canReadText };

// A photo's text in reading order, as kept in a document's readText ('' when none is found).
export const readPhotoText = async (jpegBase64: string): Promise<string> =>
  analyzeText(await cardTextRecognizer.recognize(jpegBase64), toIsoDate(new Date())).text ?? '';

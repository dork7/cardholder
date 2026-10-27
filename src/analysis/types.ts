import { Category } from '../cards/types';

// Box in 0–1 image coordinates, origin top left.
export interface OcrBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OcrLine {
  text: string;
  confidence: number; // 0–1
  box: OcrBox;
}

export interface OcrResult {
  lines: OcrLine[];
}

// Turns an image into text. The real one is the card-ocr native module; tests use a fake.
export interface TextRecognizer {
  recognize(jpegBase64: string): Promise<OcrResult>;
}

export interface Guess<T> {
  value: T;
  confidence: number; // 0–1; guesses below SUGGEST_THRESHOLD are never shown
}

export interface CardAnalysis {
  name?: Guess<string>;
  expiresOn?: Guess<string>; // YYYY-MM-DD
  category?: Guess<Category>;
  documentKey?: string; // see documentKey.ts; never shown, so not a guess
  text?: string; // what was read, in reading order; matched against folder names
}

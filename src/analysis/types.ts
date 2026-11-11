import type { SmartSuggestion } from './smartExtract';

// The broad kinds card reading sorts a document into, from keywords or the language model. Never
// stored or shown as such: a kind is offered to the user as a tag (see suggestedTag), "other" as none.
export const CATEGORIES = ['id', 'insurance', 'membership', 'other'] as const;
export type Category = (typeof CATEGORIES)[number];

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

// The optional language model (the one in use, once the user has downloaded one): card text → suggested fields,
// already checked against the text. Null when it has nothing usable. Aborting stops it.
// How long the model may take on top of the rules, unless a reader sets its own (bigger models take
// longer: src/ai/catalog.ts). A low-end phone takes a few seconds to run the smallest one.
export const SMART_TIMEOUT_MS = 8_000;

export interface SmartReader {
  read(cardText: string, signal: AbortSignal): Promise<SmartSuggestion | null>;
  timeoutMs?: number; // how long the model may take on top of the rules; SMART_TIMEOUT_MS otherwise
}

export interface Guess<T> {
  value: T;
  confidence: number; // 0–1; guesses below SUGGEST_THRESHOLD are never shown
}

export interface CardAnalysis {
  name?: Guess<string>;
  expiresOn?: Guess<string>; // YYYY-MM-DD
  category?: Guess<Category>;
  documentType?: Guess<string>; // e.g. "Residency", from the document's title; see documentType.ts
  documentKey?: string; // see documentKey.ts; never shown, so not a guess
  text?: string; // what was read, in reading order; matched against folder names
}

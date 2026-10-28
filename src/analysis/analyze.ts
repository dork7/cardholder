import { toIsoDate } from '../time/dates';
import { classifyCard } from './classify';
import { documentId, documentKey } from './documentKey';
import { extractExpiry, extractName } from './fields';
import { findMrz } from './mrz';
import { cardTextRecognizer } from './recognizer';
import { CardAnalysis, Guess, OcrResult, TextRecognizer } from './types';

// Below this, a field stays empty instead of showing a guess.
export const SUGGEST_THRESHOLD = 0.5;
// Lines OCR itself isn't sure of are noise for the rules. Vision rates its guesses 0.3 (e.g. Arabic
// read with the wrong script), and lines it could read 0.5 or more.
const MIN_LINE_CONFIDENCE = 0.4;
// A slow phone shouldn't leave the form waiting; the user can always type.
const TIMEOUT_MS = 10_000;

const keep = <T>(g: Guess<T> | undefined) => (g && g.confidence >= SUGGEST_THRESHOLD ? g : undefined);

function documentKeyOf(text: string, mrz: ReturnType<typeof findMrz>): string | undefined {
  const id = documentId(text, mrz);
  return id ? documentKey(id) : undefined;
}

export function analyzeText(result: OcrResult, today: string): CardAnalysis {
  // Reading order: top to bottom, then left to right within a row.
  const lines = result.lines
    .filter((l) => l.text.trim() !== '' && l.confidence > MIN_LINE_CONFIDENCE)
    .sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x);
  const mrz = findMrz(lines.map((l) => l.text));
  const text = lines.map((l) => l.text).join('\n');
  return {
    name: keep(extractName(lines, mrz)),
    expiresOn: keep(extractExpiry(lines, mrz, today)),
    category: keep(classifyCard(text, mrz)),
    documentKey: documentKeyOf(text, mrz),
    text,
  };
}

export async function analyzeImage(
  jpegBase64: string,
  { recognizer = cardTextRecognizer, today = toIsoDate(new Date()), timeoutMs = TIMEOUT_MS } = {},
): Promise<CardAnalysis> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Card reading timed out')), timeoutMs);
  });
  try {
    return analyzeText(await Promise.race([recognizer.recognize(jpegBase64), timeout]), today);
  } finally {
    clearTimeout(timer);
  }
}

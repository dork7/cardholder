import { toIsoDate } from '../time/dates';
import { classifyCard } from './classify';
import { documentId, documentKey } from './documentKey';
import { extractExpiry, extractName } from './fields';
import { findMrz } from './mrz';
import { cardTextRecognizer } from './recognizer';
import { SmartSuggestion } from './smartExtract';
import { CardAnalysis, Guess, OcrResult, SmartReader, TextRecognizer } from './types';

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

// The language model only fills fields the rules left empty. The rules check a value against the
// card's own structure (MRZ check digits, a labelled date); the model's answers are only checked
// against the text, so where both have one the rules win. Shown as suggestions, like any other.
export const SMART_CONFIDENCE = 0.6;
// On top of TIMEOUT_MS: a low-end phone takes a few seconds to run the model.
const SMART_TIMEOUT_MS = 8_000;

export function fillGaps(analysis: CardAnalysis, smart: SmartSuggestion): CardAnalysis {
  const guess = <T>(value: T | null): Guess<T> | undefined =>
    value === null ? undefined : { value, confidence: SMART_CONFIDENCE };
  return {
    ...analysis,
    name: analysis.name ?? guess(smart.name),
    expiresOn: analysis.expiresOn ?? guess(smart.expiresOn),
    category: analysis.category ?? guess(smart.category),
  };
}

// Rejects once `ms` pass, and calls `onTimeout` (to stop the work) if it gets there first.
async function within<T>(work: Promise<T>, ms: number, message: string, onTimeout?: () => void): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      onTimeout?.();
      reject(new Error(message));
    }, ms);
  });
  try {
    return await Promise.race([work, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

export async function analyzeImage(
  jpegBase64: string,
  {
    recognizer = cardTextRecognizer,
    today = toIsoDate(new Date()),
    timeoutMs = TIMEOUT_MS,
    smart = null as SmartReader | null,
    smartTimeoutMs = SMART_TIMEOUT_MS,
  } = {},
): Promise<CardAnalysis> {
  const analysis = analyzeText(await within(recognizer.recognize(jpegBase64), timeoutMs, 'Card reading timed out'), today);
  if (!smart || !analysis.text) return analysis;
  // The model is extra: if it fails or is slow, the rules' answers still stand.
  const stop = new AbortController();
  try {
    const suggestion = await within(smart.read(analysis.text, stop.signal), smartTimeoutMs, 'Smart reading timed out', () => stop.abort());
    return suggestion ? fillGaps(analysis, suggestion) : analysis;
  } catch (e) {
    console.warn('Smart reading failed', e);
    return analysis;
  }
}

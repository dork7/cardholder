import { Directory, File, Paths } from 'expo-file-system';
import { initLlama, LlamaContext } from 'llama.rn';
import { buildMessages, parseSuggestion, SmartSuggestion, SUGGESTION_SCHEMA } from './smartExtract';
import { SmartReader } from './types';

// Gemma 3 270M, instruction-tuned, Q8_0 GGUF (~290 MB). Not shipped in the app: it is downloaded once,
// only when the user agrees to it in Settings (development builds also fetch it from the test bench,
// see docs/gemma-sample.md). Pinned to one revision and checked against its SHA-256 before it is
// used, so the file can't change under the app.
export const MODEL_FILE = 'gemma-3-270m-it-Q8_0.gguf';
const MODEL_REVISION = 'e7647be17ae1108f2f605ed061ca0608b171afff';
export const MODEL_URL = `https://huggingface.co/ggml-org/gemma-3-270m-it-GGUF/resolve/${MODEL_REVISION}/${MODEL_FILE}`;
export const MODEL_BYTES = 291_545_600;
const MODEL_SHA256 = '0ef57d2c838458a1952664260dcba38e5bdda37494f3af732f06e4add24068e3';

const modelDir = () => new Directory(Paths.document, 'models');
export const modelFile = () => new File(modelDir(), MODEL_FILE);
const partFile = () => new File(modelDir(), `${MODEL_FILE}.part`);

export class ModelCheckError extends Error {}
export class NoSpaceError extends Error {}

// Downloads to a .part file, checks it, and only then moves it into place, so an interrupted or
// corrupted download never leaves a model behind. Progress is 0–1, or null if the size is unknown.
// Callers must have the user's go-ahead: this is the app's only use of the internet.
export async function downloadModel(onProgress?: (fraction: number | null) => void, signal?: AbortSignal): Promise<void> {
  // Room for the model plus some to spare, so the phone isn't left full.
  if (Paths.availableDiskSpace < MODEL_BYTES + 200_000_000) throw new NoSpaceError('Not enough free space');
  modelDir().create({ intermediates: true, idempotent: true });
  const part = partFile();
  try {
    await File.downloadFileAsync(MODEL_URL, part, {
      idempotent: true,
      signal,
      onProgress: ({ bytesWritten, totalBytes }) => onProgress?.(totalBytes > 0 ? bytesWritten / totalBytes : null),
    });
    if (part.size !== MODEL_BYTES || (await part.digest('SHA-256')) !== MODEL_SHA256) {
      throw new ModelCheckError('The downloaded model failed its check');
    }
    await part.move(modelFile(), { overwrite: true });
  } finally {
    // A fresh File: after the move, `part` points at the model itself.
    const leftover = partFile();
    if (leftover.exists) leftover.delete();
  }
}

export interface ExtractRun {
  suggestion: SmartSuggestion | null; // null when the output wasn't usable JSON
  raw: string;
  promptMs: number;
  predictMs: number;
  tokensPerSecond: number;
}

let context: Promise<LlamaContext> | null = null;

function load(): Promise<LlamaContext> {
  if (!context) {
    const file = modelFile();
    if (!file.exists) throw new Error(`Model not found at ${file.uri}`);
    // CPU only: the model is small enough, and it keeps behaviour the same on every phone.
    context = initLlama({ model: file.uri, n_ctx: 1024, n_gpu_layers: 0, use_mlock: false });
    context.catch(() => {
      context = null;
    });
  }
  return context;
}

// One model, one job at a time: the front and back of a card are read one after the other, and the
// model is only freed once nothing is running on it.
let queue: Promise<unknown> = Promise.resolve();
function serially<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job);
  queue = run.catch(() => {});
  return run;
}

// Aborting stops the model mid-answer, and a job still waiting its turn never starts.
export function extractWithGemma(cardText: string, signal?: AbortSignal): Promise<ExtractRun> {
  return serially(async () => {
    if (signal?.aborted) throw new Error('Card reading was stopped');
    const llama = await load();
    const stop = () => void llama.stopCompletion();
    signal?.addEventListener('abort', stop);
    try {
      const result = await llama.completion({
        messages: buildMessages(cardText),
        response_format: { type: 'json_schema', json_schema: { strict: true, schema: SUGGESTION_SCHEMA } },
        temperature: 0, // extraction, not writing: always take the most likely token
        n_predict: 96,
      });
      return {
        suggestion: parseSuggestion(result.text, cardText),
        raw: result.text,
        promptMs: result.timings.prompt_ms,
        predictMs: result.timings.predicted_ms,
        tokensPerSecond: result.timings.predicted_per_second,
      };
    } finally {
      signal?.removeEventListener('abort', stop);
    }
  });
}

// Card reading's smart step (see analyze.ts). Does nothing until the user has downloaded the model.
export const gemmaReader: SmartReader = {
  read: async (cardText, signal) => (modelFile().exists ? (await extractWithGemma(cardText, signal)).suggestion : null),
};

// Frees the loaded model first, so the file isn't deleted out from under it. Also clears a leftover partial download.
export async function deleteModel(): Promise<void> {
  await releaseGemma();
  for (const file of [modelFile(), partFile()]) if (file.exists) file.delete();
}

// Frees the ~300 MB the loaded model takes, once any job running on it is done.
export function releaseGemma(): Promise<void> {
  return serially(async () => {
    const current = context;
    context = null;
    if (current) await (await current).release();
  });
}

import { Directory, File, Paths } from 'expo-file-system';
import { initLlama, LlamaContext } from 'llama.rn';
import { buildMessages, parseSuggestion, SmartSuggestion, SUGGESTION_SCHEMA } from './smartExtract';

// Gemma 3 270M, instruction-tuned, Q8_0 GGUF (~290 MB). Release builds never download it (the app
// never touches the internet); development builds fetch it when it's missing (see docs/gemma-sample.md).
export const MODEL_FILE = 'gemma-3-270m-it-Q8_0.gguf';
export const MODEL_URL = `https://huggingface.co/ggml-org/gemma-3-270m-it-GGUF/resolve/main/${MODEL_FILE}`;

const modelDir = () => new Directory(Paths.document, 'models');
export const modelFile = () => new File(modelDir(), MODEL_FILE);
const partFile = () => new File(modelDir(), `${MODEL_FILE}.part`);

// Development builds only. Downloads to a .part file and moves it into place once complete, so an
// interrupted download never leaves a truncated model behind. Progress is 0–1, or null if the size is unknown.
export async function downloadModel(onProgress?: (fraction: number | null) => void, signal?: AbortSignal): Promise<void> {
  if (!__DEV__) throw new Error('Model download is only available in development builds');
  modelDir().create({ intermediates: true, idempotent: true });
  const part = partFile();
  await File.downloadFileAsync(MODEL_URL, part, {
    idempotent: true,
    signal,
    onProgress: ({ bytesWritten, totalBytes }) => onProgress?.(totalBytes > 0 ? bytesWritten / totalBytes : null),
  });
  part.move(modelFile(), { overwrite: true });
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

export async function extractWithGemma(cardText: string): Promise<ExtractRun> {
  const llama = await load();
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
}

// Frees the loaded model first, so the file isn't deleted out from under it. Also clears a leftover partial download.
export async function deleteModel(): Promise<void> {
  await releaseGemma();
  for (const file of [modelFile(), partFile()]) if (file.exists) file.delete();
}

export async function releaseGemma(): Promise<void> {
  const current = context;
  context = null;
  if (current) await (await current).release();
}

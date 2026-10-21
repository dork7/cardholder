import { File, Paths } from 'expo-file-system';
import { initLlama, LlamaContext } from 'llama.rn';
import { buildMessages, parseSuggestion, SmartSuggestion, SUGGESTION_SCHEMA } from './smartExtract';

// Gemma 3 270M, instruction-tuned, Q8_0 GGUF (~290 MB). The app never downloads it: for the sample,
// it is copied into the app's documents folder from a computer (see docs/gemma-sample.md).
export const MODEL_FILE = 'gemma-3-270m-it-Q8_0.gguf';

export const modelFile = () => new File(Paths.document, 'models', MODEL_FILE);

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

export async function releaseGemma(): Promise<void> {
  const current = context;
  context = null;
  if (current) await (await current).release();
}

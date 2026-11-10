import { Directory, File, Paths } from 'expo-file-system';
import { initLlama, LlamaContext } from 'llama.rn';
import { Platform } from 'react-native';
import { CATALOG, entry, LocalModelEntry, LocalModelId } from '../ai/catalog';
import { Loaded, loadWithFallback, runWithFallback } from '../ai/loadWithFallback';
import { createPrefs } from '../ai/localModelPrefs';
import { buildMessages, parseSuggestion, SmartSuggestion, SUGGESTION_SCHEMA } from './smartExtract';
import { SMART_TIMEOUT_MS, SmartReader } from './types';

// The downloaded models (src/ai/catalog.ts), run on the phone with llama.rn. None is shipped in the
// app: each is downloaded once, only when the user picks it in Settings → AI models (development builds
// also fetch them from the bench, see docs/model-bench.md). Each file is pinned to one revision and
// checked against its SHA-256 before it is used, so it can't change under the app. One model, the
// active one, is loaded at a time; it reads cards and answers questions.

const modelDir = () => new Directory(Paths.document, 'models');
export const modelFile = (e: LocalModelEntry) => new File(modelDir(), e.file);
const partFile = (e: LocalModelEntry) => new File(modelDir(), `${e.file}.part`);
const prefsFile = () => new File(modelDir(), 'prefs.json');

export const isDownloaded = (id: LocalModelId): boolean => modelFile(entry(id)!).exists;

export const prefs = createPrefs(
  {
    read: () => {
      const f = prefsFile();
      return f.exists ? f.textSync() : null;
    },
    write: (text) => {
      modelDir().create({ intermediates: true, idempotent: true });
      prefsFile().writeSync(text);
    },
  },
  isDownloaded,
);

export function activeEntry(): LocalModelEntry | null {
  const id = prefs.get().active;
  return id ? entry(id) : null;
}

export class ModelCheckError extends Error {}
export class NoSpaceError extends Error {}

// Downloads to a .part file, checks it, and only then moves it into place, so an interrupted or
// corrupted download never leaves a model behind. Progress is 0–1, or null if the size is unknown.
// Callers must have the user's go-ahead: model downloads are the app's own use of the internet (ADR 0005).
export async function downloadModel(e: LocalModelEntry, onProgress?: (fraction: number | null) => void, signal?: AbortSignal): Promise<void> {
  // Room for the model plus some to spare, so the phone isn't left full.
  if (Paths.availableDiskSpace < e.bytes + 200_000_000) throw new NoSpaceError('Not enough free space');
  modelDir().create({ intermediates: true, idempotent: true });
  const part = partFile(e);
  try {
    await File.downloadFileAsync(e.url, part, {
      idempotent: true,
      signal,
      onProgress: ({ bytesWritten, totalBytes }) => onProgress?.(totalBytes > 0 ? bytesWritten / totalBytes : null),
    });
    if (part.size !== e.bytes || (await part.digest('SHA-256')) !== e.sha256) {
      throw new ModelCheckError('The downloaded model failed its check');
    }
    await part.move(modelFile(e), { overwrite: true });
  } finally {
    // A fresh File: after the move, `part` points at the model itself.
    const leftover = partFile(e);
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

// Development builds can try another context size on the bench; release builds always use the entry's.
let contextOverride: number | null = null;
export function setContextOverride(nCtx: number | null): void {
  if (__DEV__) contextOverride = nCtx;
}

// Only Android tries the GPU (OpenCL): iPhone runs the downloaded models on the CPU (ADR 0006).
const gpuAllowed = () => Platform.OS === 'android';

// Screens that show where the model runs hear when it loads or is freed.
const loadListeners = new Set<() => void>();
export function onLoadChange(listener: () => void): () => void {
  loadListeners.add(listener);
  return () => loadListeners.delete(listener);
}
const loadChanged = () => {
  for (const listener of loadListeners) listener();
};

let loaded: Promise<Loaded<LlamaContext>> | null = null;
let loadedKey: string | null = null; // which model, at which context size
let loadedId: LocalModelId | null = null;
// Where a model ran when it last loaded. Kept after it is freed, so Settings can still say.
let lastOnGpu: { id: LocalModelId; key: string; onGpu: boolean } | null = null;

const keyOf = (e: LocalModelEntry) => `${e.id}@${contextOverride ?? e.nCtx}`;

// Not queued: only call from inside `serially`, or when nothing can be running.
async function releaseNow(): Promise<void> {
  const current = loaded;
  loaded = null;
  loadedKey = null;
  loadedId = null;
  if (current) {
    await (await current.catch(() => null))?.context.release();
    loadChanged();
  }
}

// The active model, loaded GPU first (src/ai/loadWithFallback.ts). Another model, or another context
// size, frees the old one first: two at once would not fit on many phones.
// `forceCpu` is the retry after a failed GPU run; `e` keeps a job on the model it started with.
async function load(e = activeEntry(), forceCpu = false): Promise<{ e: LocalModelEntry; current: Loaded<LlamaContext> }> {
  if (!e) throw new Error('No model is active');
  // A forced-CPU copy is kept apart, so the next ordinary job tries the GPU again unless the model has
  // been remembered as CPU-only.
  const key = forceCpu ? `${keyOf(e)}:cpu` : keyOf(e);
  if (loadedKey !== key) await releaseNow();
  if (!loaded) {
    loadedKey = key;
    loadedId = e.id;
    const attempt = loadWithFallback(
      e,
      forceCpu || !gpuAllowed() || prefs.get().cpuOnly.includes(e.id),
      (nGpuLayers) => initLlama({ model: modelFile(e).uri, n_ctx: contextOverride ?? e.nCtx, n_gpu_layers: nGpuLayers, use_mlock: false }),
      () => prefs.markCpuOnly(e.id),
    );
    loaded = attempt;
    attempt.then(
      (l) => {
        // The CPU retry after a failed GPU run is a one-off, not where the model runs.
        if (loaded === attempt && !forceCpu) lastOnGpu = { id: e.id, key, onGpu: l.onGpu };
        loadChanged();
      },
      () => {
        if (loaded === attempt) {
          loaded = null;
          loadedKey = null;
          loadedId = null;
        }
      },
    );
  }
  return { e, current: await loaded };
}

// Whether the active model runs on the GPU: as it last loaded (still known after it is freed), or
// false when it can only use the CPU here (a CPU-only file, an iPhone, or remembered as failing on
// this phone's GPU); null until it is known. Another model, or deleting this one, starts over.
export function onGpu(): boolean | null {
  const e = activeEntry();
  if (!e) return null;
  // The CPU-only mark comes first: a later run can fail on the GPU after it loaded there.
  if (!e.gpu || !gpuAllowed() || prefs.get().cpuOnly.includes(e.id)) return false;
  return lastOnGpu?.key === keyOf(e) ? lastOnGpu.onGpu : null;
}

type CompletionParams = Parameters<LlamaContext['completion']>[0];

// One completion on the active model. A run that fails on the GPU is tried again on the CPU, and the
// model is remembered as CPU-only on this phone. Aborting stops whichever context is running.
// `onFirstWord` hears when the model writes its first piece of text (the bench times it).
async function complete(params: CompletionParams, signal: AbortSignal | undefined, onFirstWord?: () => void) {
  const { e, current } = await load();
  // A stop that came while the model was loading: the listener below would never hear it.
  if (signal?.aborted) throw new Error('Stopped while the model was loading');
  const full: CompletionParams = e.thinking === null ? params : { ...params, enable_thinking: e.thinking };
  let running: LlamaContext | null = null;
  const stop = () => void running?.stopCompletion().catch(() => {});
  signal?.addEventListener('abort', stop);
  try {
    return await runWithFallback(
      current,
      (c) => {
        running = c;
        if (!onFirstWord) return c.completion(full);
        let heard = false;
        return c.completion(full, () => {
          if (!heard) onFirstWord();
          heard = true;
        });
      },
      async () => {
        await releaseNow();
        return (await load(e, true)).current;
      },
      () => signal?.aborted ?? false,
      () => prefs.markCpuOnly(e.id),
    );
  } finally {
    signal?.removeEventListener('abort', stop);
  }
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
export function extractWithLocalModel(cardText: string, signal?: AbortSignal): Promise<ExtractRun> {
  return serially(async () => {
    if (signal?.aborted) throw new Error('Card reading was stopped');
    const result = await complete(
      {
        messages: buildMessages(cardText),
        response_format: { type: 'json_schema', json_schema: { strict: true, schema: SUGGESTION_SCHEMA } },
        temperature: 0, // extraction, not writing: always take the most likely token
        n_predict: 96,
      },
      signal,
    );
    return {
      suggestion: parseSuggestion(result.text, cardText),
      raw: result.text,
      promptMs: result.timings.prompt_ms,
      predictMs: result.timings.predicted_ms,
      tokensPerSecond: result.timings.predicted_per_second,
    };
  });
}

// A JSON reply to a system and user prompt, held to `schema`. Used by asking (src/ai/models.ts).
export function generateWithLocalModel(
  prompt: { system: string; user: string },
  options: { maxTokens: number; schema: object },
  signal: AbortSignal,
  onFirstWord?: () => void,
): Promise<string> {
  return serially(async () => {
    if (signal.aborted) throw new Error('Asking was stopped');
    const result = await complete(
      {
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        response_format: { type: 'json_schema', json_schema: { strict: true, schema: options.schema } },
        temperature: 0,
        n_predict: options.maxTokens,
      },
      signal,
      onFirstWord,
    );
    return result.text;
  });
}

// Card reading's smart step (see analyze.ts). Does nothing until the user has downloaded a model.
// Its time limit is the active model's: bigger models take longer.
export const localReader: SmartReader = {
  read: async (cardText, signal) => (activeEntry() ? (await extractWithLocalModel(cardText, signal)).suggestion : null),
  get timeoutMs() {
    return activeEntry()?.readTimeoutMs ?? SMART_TIMEOUT_MS;
  },
};

// Frees the loaded model first if it is this one, so the file isn't deleted out from under it. Also
// clears a leftover partial download. If it was the active model, another downloaded one takes over.
export function deleteModel(id: LocalModelId): Promise<void> {
  return serially(async () => {
    const e = entry(id)!;
    const wasActive = prefs.get().active === id;
    if (loadedId === id) await releaseNow();
    if (lastOnGpu?.id === id) lastOnGpu = null;
    for (const file of [modelFile(e), partFile(e)]) if (file.exists) file.delete();
    // A fresh download tries the GPU again.
    prefs.clearCpuOnly(id);
    if (wasActive) prefs.update({ active: CATALOG.find((c) => isDownloaded(c.id))?.id ?? null });
  });
}

// Frees the memory the loaded model takes, once any job running on it is done.
export function releaseLocalModel(): Promise<void> {
  return serially(releaseNow);
}

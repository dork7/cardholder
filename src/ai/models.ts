import { requireOptionalNativeModule } from 'expo';
import { activeEntry, generateWithLocalModel, prefs } from '../analysis/localModel';
import { PROMPT_CHARS_AT_4K, promptCharsFor } from './catalog';
import { AskModel, ModelChoice } from './model';

// The phone's built-in model, through modules/builtin-model: Gemini Nano (ML Kit GenAI) on Android,
// Apple Foundation Models on iPhone. Absent in builds made before the module, and in tests.
export type BuiltInStatus = 'available' | 'downloadable' | 'downloading' | 'off' | 'unsupported';

interface BuiltInModelModule {
  availability(): Promise<BuiltInStatus>;
  prepare(): Promise<boolean>; // fetches Gemini Nano when it is downloadable; false where that isn't possible
  generate(prompt: string, maxTokens: number): Promise<string>;
  cancel(): void;
}

const native = requireOptionalNativeModule<BuiltInModelModule>('BuiltInModel');

export async function builtInStatus(): Promise<BuiltInStatus> {
  if (!native) return 'unsupported';
  try {
    return await native.availability();
  } catch (e) {
    console.warn('Checking the built-in model failed', e);
    return 'unsupported';
  }
}

// Starts the one-time download of the built-in model (Android); resolves when it can be used.
export async function prepareBuiltIn(): Promise<boolean> {
  return native ? native.prepare() : false;
}

const builtInModel: AskModel = {
  kind: 'built-in',
  // Both built-in models have a context of about 4,000 tokens; downloaded models get theirs from
  // their own context size.
  promptChars: PROMPT_CHARS_AT_4K,
  async generate(prompt, options, signal) {
    if (!native) throw new Error('No built-in model');
    if (signal.aborted) throw new Error('Asking was stopped');
    const stop = () => native.cancel();
    signal.addEventListener('abort', stop);
    try {
      // One prompt: the built-in models don't take a separate system part through this module.
      return await native.generate(`${prompt.system}\n\n${prompt.user}`, options.maxTokens);
    } finally {
      signal.removeEventListener('abort', stop);
    }
  },
};

// The downloaded model in use, as asking sees it. `onFirstWord` is the bench's stopwatch.
export const localAskModel = (nCtx: number, onFirstWord?: () => void): AskModel => ({
  kind: 'local',
  promptChars: promptCharsFor(nCtx),
  generate: (prompt, options, signal) => generateWithLocalModel(prompt, options, signal, onFirstWord),
});

// The built-in model first, unless the user chose the downloaded one in Settings (and has one);
// otherwise whichever is ready.
export async function chooseModel(): Promise<ModelChoice> {
  const status = await builtInStatus();
  const active = activeEntry();
  if (active && prefs.get().askWith === 'downloaded') return { status: 'ready', model: localAskModel(active.nCtx) };
  if (status === 'available') return { status: 'ready', model: builtInModel };
  if (active) return { status: 'ready', model: localAskModel(active.nCtx) };
  if (status === 'downloadable') return { status: 'unavailable', reason: 'built-in-downloadable' };
  if (status === 'downloading') return { status: 'unavailable', reason: 'built-in-preparing' };
  if (status === 'off') return { status: 'unavailable', reason: 'built-in-off' };
  return { status: 'unavailable', reason: 'needs-download' };
}

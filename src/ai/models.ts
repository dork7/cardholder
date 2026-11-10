import { requireOptionalNativeModule } from 'expo';
import { activeEntry, generateWithLocalModel } from '../analysis/localModel';
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

// Both built-in models have a context of about 4,000 tokens; Gemma is loaded with 4,096. Roughly three
// characters a token, less the answer and some room for Arabic, which takes more tokens per character.
const PROMPT_CHARS = 7000;

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
  promptChars: PROMPT_CHARS,
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

const gemmaModel: AskModel = {
  kind: 'gemma',
  promptChars: PROMPT_CHARS,
  generate: generateWithLocalModel,
};

// The phone's own model when it has one ready, otherwise Gemma if the user downloaded it.
export async function chooseModel(): Promise<ModelChoice> {
  const status = await builtInStatus();
  if (status === 'available') return { status: 'ready', model: builtInModel };
  if (activeEntry()) return { status: 'ready', model: gemmaModel };
  if (status === 'downloadable') return { status: 'unavailable', reason: 'built-in-downloadable' };
  if (status === 'downloading') return { status: 'unavailable', reason: 'built-in-preparing' };
  if (status === 'off') return { status: 'unavailable', reason: 'built-in-off' };
  return { status: 'unavailable', reason: 'needs-download' };
}

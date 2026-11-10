// The models the user can download in Settings → AI models. Fixed in the app (ADR 0006): each file is
// pinned to one Hugging Face revision and checked against its SHA-256, so it can't change under the app.
// Q6_K where possible: it is the best quality llama.rn's OpenCL (GPU) path runs. Gemma stays the Q8_0
// file people already have, so nobody downloads it again; Q8_0 runs on the CPU only.

export type LocalModelId = 'gemma-270m' | 'qwen2.5-0.5b' | 'qwen3-0.6b' | 'llama3.2-1b';

export interface LocalModelEntry {
  id: LocalModelId;
  name: string;
  file: string;
  url: string;
  bytes: number;
  sha256: string;
  nCtx: number; // tokens; tuned on the bench (docs/model-bench.md)
  gpu: boolean; // whether to try OpenCL first (Q4_0 / Q6_K only)
  thinking: boolean | null; // false: turn a thinking model's reasoning off; null: not a thinking model
  readTimeoutMs: number; // card reading's limit for this model, on top of the rules' own
}

const hf = (repo: string, revision: string, file: string) => `https://huggingface.co/${repo}/resolve/${revision}/${file}`;

export const CATALOG: readonly LocalModelEntry[] = [
  {
    id: 'gemma-270m',
    name: 'Gemma 3 270M',
    file: 'gemma-3-270m-it-Q8_0.gguf',
    url: hf('ggml-org/gemma-3-270m-it-GGUF', 'e7647be17ae1108f2f605ed061ca0608b171afff', 'gemma-3-270m-it-Q8_0.gguf'),
    bytes: 291_545_600,
    sha256: '0ef57d2c838458a1952664260dcba38e5bdda37494f3af732f06e4add24068e3',
    nCtx: 4096,
    gpu: false,
    thinking: null,
    readTimeoutMs: 8_000,
  },
  {
    id: 'qwen2.5-0.5b',
    name: 'Qwen2.5 0.5B',
    file: 'qwen2.5-0.5b-instruct-q6_k.gguf',
    url: hf('Qwen/Qwen2.5-0.5B-Instruct-GGUF', '9217f5db79a29953eb74d5343926648285ec7e67', 'qwen2.5-0.5b-instruct-q6_k.gguf'),
    bytes: 650_379_104,
    sha256: '2f82233630c349ccf6b8daccf48f9a7865713d9f08a2eadfa456cebe9b97c7f5',
    nCtx: 4096,
    gpu: true,
    thinking: null,
    readTimeoutMs: 12_000,
  },
  {
    id: 'qwen3-0.6b',
    name: 'Qwen3 0.6B',
    file: 'Qwen3-0.6B-Q6_K.gguf',
    url: hf('unsloth/Qwen3-0.6B-GGUF', '50968a4468ef4233ed78cd7c3de230dd1d61a56b', 'Qwen3-0.6B-Q6_K.gguf'),
    bytes: 495_107_776,
    sha256: '1c15a88244c9e852516e5ba0e394fc97f2182f1f2757413fb99fe6a9214c033b',
    nCtx: 4096,
    gpu: true,
    thinking: false,
    readTimeoutMs: 14_000,
  },
  {
    id: 'llama3.2-1b',
    name: 'Llama 3.2 1B',
    file: 'Llama-3.2-1B-Instruct-Q6_K.gguf',
    url: hf('bartowski/Llama-3.2-1B-Instruct-GGUF', '067b946cf014b7c697f3654f621d577a3e3afd1c', 'Llama-3.2-1B-Instruct-Q6_K.gguf'),
    bytes: 1_021_800_576,
    sha256: '0f4c510daf16e0d1b3bc94931fd9296c28936bebdda2593687d4eb70c5b70628',
    nCtx: 4096,
    gpu: true,
    thinking: null,
    readTimeoutMs: 20_000,
  },
];

export const RECOMMENDED: LocalModelId = 'qwen2.5-0.5b';

export function entry(id: string): LocalModelEntry | null {
  return CATALOG.find((e) => e.id === id) ?? null;
}

// The prompt a context of about 4,000 tokens holds: roughly three characters a token, less the answer
// and room for Arabic (more tokens per character). Asking was tuned with it.
export const PROMPT_CHARS_AT_4K = 7000;

// The same share of a bigger or smaller context: 4,096 tokens gives PROMPT_CHARS_AT_4K.
export function promptCharsFor(nCtx: number): number {
  return Math.round(((nCtx - 1500) * PROMPT_CHARS_AT_4K) / 2596);
}

// The file is mapped into memory, plus its working memory and the app: under 3× the file is tight.
export function lowMemory(e: LocalModelEntry, totalRamBytes: number | null): boolean {
  return totalRamBytes !== null && totalRamBytes < e.bytes * 3;
}

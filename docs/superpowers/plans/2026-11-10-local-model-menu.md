# Local model menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single downloaded Gemma 3 270M with a fixed menu of four pinned on-device models, each run on the GPU (OpenCL) first with a remembered CPU fallback, and let the active one do both card reading and asking.

**Architecture:** A pure catalogue (`src/ai/catalog.ts`) describes each model: file, revision, SHA-256, context size and limits. A small JSON prefs file next to the models holds which model is active, which models must run on the CPU on this phone, and whether asking uses the built-in model or the downloaded one. `src/analysis/localModel.ts` (the renamed `gemma.ts`) loads the active entry through `loadWithFallback`. The download store tracks each model separately and runs one download at a time. Settings → AI becomes a list of the four models.

**Tech Stack:** Expo 58, React Native 0.88, `llama.rn` 0.13.0-rc.7 (llama.cpp, OpenCL on Adreno), `expo-file-system`, `expo-device` (new, for total RAM), Jest with `jest-expo`.

**Spec:** the grilling session of 2026-11-10, summarised in "Decisions" below. There is no separate spec file; this section is the spec.

## Decisions (the spec)

1. **Android is the target.** iOS keeps Apple Foundation Models first and the downloaded model as the fallback, on the CPU. The menu works on iOS too, with no Metal.
2. **A fixed menu built into the app.** Each model is pinned to a Hugging Face revision and checked against its SHA-256. Nothing about the catalogue is fetched.
3. **The four models:**

   | id | Model | File | Bytes | Runs on |
   |---|---|---|---|---|
   | `gemma-270m` | Gemma 3 270M (the existing file, unchanged) | `gemma-3-270m-it-Q8_0.gguf` | 291,545,600 | CPU only (Q8_0 can't use OpenCL) |
   | `qwen2.5-0.5b` | Qwen2.5-0.5B-Instruct, **Recommended** | `qwen2.5-0.5b-instruct-q6_k.gguf` | 650,379,104 | GPU, then CPU |
   | `qwen3-0.6b` | Qwen3-0.6B, thinking off | `Qwen3-0.6B-Q6_K.gguf` | 495,107,776 | GPU, then CPU |
   | `llama3.2-1b` | Llama 3.2 1B Instruct | `Llama-3.2-1B-Instruct-Q6_K.gguf` | 1,021,800,576 | GPU, then CPU |

4. **Several models can be downloaded; one is active.** Each one can be deleted separately, and sizes are shown.
5. **One download at a time.** Each download gets the free-space check and the SHA-256 check.
6. **Low-RAM warning, never hidden.** Every model stays listed. If the phone has less than 3× the model's file size in RAM, show "May be slow or close on this phone".
7. **GPU first.** Load with `n_gpu_layers: 99`. If loading throws or reports `gpu: false`, load on the CPU. If a GPU run throws partway through, retry that run once on the CPU. Either way, remember "CPU" for that model on this phone. Settings shows "Running on GPU" or "Running on CPU" for the active model once it has loaded.
8. **The active model does both jobs:** card reading and asking.
9. **Asking uses the built-in model by default** where it is ready. An "Ask with" switch (Built-in / the downloaded model) lets the user override that.
10. **Context is set per model.** All four start at 4,096 tokens. The test bench (Task 9) also tries 8,192 for `qwen2.5-0.5b` and `llama3.2-1b`. 8,192 is kept for a model only if it answers more questions correctly *and* the Pixel (CPU) shows the first word in under about 30 s. `qwen3-0.6b` stays at 4,096 (its working memory at 8k is about 900 MB).
11. **Measure before shipping.** Run all four models on a Snapdragon 8 Gen 1+ phone (GPU) and a Pixel (CPU), measuring valid-JSON rate, card fields read correctly, answers found, and time to first word. Drop from the menu any model that doesn't beat Gemma on accuracy.
12. **Write ADR 0006.** Update ADR 0005's list of network uses to "model downloads, one per model the user picks".

## Global Constraints

- `llama.rn` stays at `0.13.0-rc.7`. OpenCL works only on Adreno 700+ with Q4_0 / Q6_K weights, and only when the phone also has Hexagon (SM8450+), because the OpenCL build is the `..._hexagon_opencl` library.
- No network use other than a model download the user confirmed. The confirmation states the size and "Hugging Face".
- Every file is pinned by revision and checked by SHA-256. A file that fails the check is never moved into place.
- The app's copy follows the existing `strings.ts` voice: plain sentences, no jargon ("GPU" and "CPU" are allowed only in the "Running on" line).
- APK growth from putting the OpenCL library back must be reported in the commit message, measured with `scripts/release-android.sh` output size, before and after.
- Do not edit `app/` or `src/` while `scripts/release-android.sh` is running (it bundles the working tree).
- Tests: `npm test` and `npm run typecheck` pass after every task.

## Review Focus

1. **Someone who already has Gemma downloaded upgrades the app.** They must see Gemma as downloaded and active, with no re-download. → Task 2 test "existing Gemma file becomes the active model".
2. **The active model is deleted while a card is being read or a question asked.** Deletion must wait for the running job, and nothing may load a missing file. Afterwards, active becomes null, or the next downloaded model. → Task 4 test "deleting the active model picks another downloaded one or none".
3. **The prefs file is missing, corrupt, or names a model that isn't in the catalogue** (one dropped by Task 9). Fall back to the defaults and never crash. → Task 2 test "unknown or corrupt prefs fall back to defaults".
4. **The GPU loads but fails on the first completion** (OpenCL driver bugs). This is the mid-run fallback: retry on the CPU once, then remember CPU. → Task 3 test "a GPU run that throws is retried once on CPU and remembered".
5. **A slow model on a slow phone hits card reading's time limit**, and the user sees no suggestions with no error. The time limit comes from the model's entry. → Task 6 test "the smart reader's timeout comes from the active model".

---

## File structure

| File | Responsibility |
|---|---|
| `src/ai/catalog.ts` (new) | The four entries; `promptCharsFor`; `lowMemory`. Pure, no I/O. |
| `src/ai/localModelPrefs.ts` (new) | Read/write `models/prefs.json`: active id, CPU-only ids, ask-with. Defaults and migration. |
| `src/ai/loadWithFallback.ts` (new) | GPU-then-CPU loading and the once-retry on CPU. Pure over an injected `init`. |
| `src/analysis/localModel.ts` (renamed from `gemma.ts`) | Download/delete one entry; load the active entry; `extract…` / `generate…`; release. |
| `src/analysis/modelDownload.ts` | Per-model download state, one download at a time, set active, remove. |
| `src/ai/models.ts`, `src/ai/model.ts` | `chooseModel` honours ask-with and the active entry's context. |
| `src/analysis/types.ts`, `src/analysis/analyze.ts` | `SmartReader.timeoutMs`. |
| `app/settings.tsx`, `src/strings.ts` | The model list, Ask-with switch, Running-on line. |
| `app/dev/gemma.tsx` → `app/dev/models.tsx` | Bench: pick a model, context size, run the eval set, show timings. |
| `src/ai/eval/cases.ts` (new) | Eval cases (card text → expected fields; question → expected answer). |
| `app.json`, `plugins/withSmallerApk.js`, `package.json` | Enable OpenCL, keep its library, add `expo-device`. |
| `docs/adr/0006-…`, `docs/adr/0005-…`, `docs/adr/0001-…`, `docs/design.md`, `docs/gemma-sample.md` → `docs/model-bench.md` | Docs. |

---

### Task 0: Clear the working tree

The working tree has uncommitted Ask/keyboard work (`src/ai/ask.ts`, `src/ai/__tests__/ask.test.ts`, `src/ui/AskSheet.tsx`, `src/ui/useKeyboardHeight.ts`). This plan touches `src/ai/` and `AskSheet`'s mocks.

- [ ] **Step 1:** Ask the owner whether to commit or stash that work. Do neither without an answer.
- [ ] **Step 2:** Create branch `feat/local-model-menu` from `main`.

---

### Task 1: The catalogue

**Files:**
- Create: `src/ai/catalog.ts`
- Test: `src/ai/__tests__/catalog.test.ts`

**Interfaces:**
- Produces:
  - `type LocalModelId = 'gemma-270m' | 'qwen2.5-0.5b' | 'qwen3-0.6b' | 'llama3.2-1b'`
  - `interface LocalModelEntry { id; name: string; file: string; url: string; bytes: number; sha256: string; nCtx: number; gpu: boolean; thinking: boolean | null; readTimeoutMs: number; license: string }`
  - `CATALOG: readonly LocalModelEntry[]`, `RECOMMENDED: LocalModelId`, `entry(id: string): LocalModelEntry | null`
  - `promptCharsFor(nCtx: number): number`
  - `lowMemory(e: LocalModelEntry, totalRamBytes: number | null): boolean`

- [ ] **Step 1: Write the failing test**

```ts
// src/ai/__tests__/catalog.test.ts
import { CATALOG, entry, lowMemory, promptCharsFor, RECOMMENDED } from '../catalog';

test('four models, Qwen2.5 recommended, ids unique', () => {
  expect(CATALOG.map((e) => e.id)).toEqual(['gemma-270m', 'qwen2.5-0.5b', 'qwen3-0.6b', 'llama3.2-1b']);
  expect(RECOMMENDED).toBe('qwen2.5-0.5b');
});

test('every file is pinned to a revision and a SHA-256', () => {
  for (const e of CATALOG) {
    expect(e.url).toMatch(/^https:\/\/huggingface\.co\/[^/]+\/[^/]+\/resolve\/[0-9a-f]{40}\//);
    expect(e.url.endsWith(`/${e.file}`)).toBe(true);
    expect(e.sha256).toMatch(/^[0-9a-f]{64}$/);
  }
});

test('the existing Gemma file is unchanged and CPU only', () => {
  const g = entry('gemma-270m')!;
  expect(g.file).toBe('gemma-3-270m-it-Q8_0.gguf');
  expect(g.bytes).toBe(291_545_600);
  expect(g.sha256).toBe('0ef57d2c838458a1952664260dcba38e5bdda37494f3af732f06e4add24068e3');
  expect(g.gpu).toBe(false);
});

test('Qwen3 has thinking turned off; the others leave it alone', () => {
  expect(entry('qwen3-0.6b')!.thinking).toBe(false);
  expect(entry('qwen2.5-0.5b')!.thinking).toBeNull();
});

test('an unknown id is not an entry', () => {
  expect(entry('phi-3')).toBeNull();
});

test('4,096 tokens keep the 7,000 characters asking used before', () => {
  expect(promptCharsFor(4096)).toBe(7000);
  expect(promptCharsFor(8192)).toBeGreaterThan(14_000);
});

test('warns when the phone has less than 3× the file in RAM; never when RAM is unknown', () => {
  const llama = entry('llama3.2-1b')!;
  expect(lowMemory(llama, 3e9)).toBe(true);
  expect(lowMemory(llama, 4e9)).toBe(false);
  expect(lowMemory(llama, null)).toBe(false);
});
```

- [ ] **Step 2: Run it.** `npx jest src/ai/__tests__/catalog.test.ts`. Expected: FAIL, "Cannot find module '../catalog'".

- [ ] **Step 3: Implement**

```ts
// src/ai/catalog.ts
// The models the user can download in Settings → AI. Fixed in the app (ADR 0006): each file is pinned
// to one Hugging Face revision and checked against its SHA-256, so it can't change under the app.
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
  nCtx: number; // tokens; see Task 9 of docs/superpowers/plans/2026-11-10-local-model-menu.md
  gpu: boolean; // whether to try OpenCL first (Q4_0 / Q6_K only)
  thinking: boolean | null; // false: turn a thinking model's reasoning off; null: not a thinking model
  readTimeoutMs: number; // card reading's limit for this model, on top of the rules' own
  license: string;
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
    license: 'Gemma 3 270M by Google, under the Gemma Terms of Use.',
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
    license: 'Qwen2.5 0.5B by Alibaba Cloud, under the Apache 2.0 licence.',
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
    license: 'Qwen3 0.6B by Alibaba Cloud, under the Apache 2.0 licence.',
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
    license: 'Llama 3.2 1B by Meta, under the Llama 3.2 Community License. Built with Llama.',
  },
];

export const RECOMMENDED: LocalModelId = 'qwen2.5-0.5b';

export function entry(id: string): LocalModelEntry | null {
  return CATALOG.find((e) => e.id === id) ?? null;
}

// Roughly three characters a token, less the answer and room for Arabic (more tokens per character).
// 4,096 tokens gives the 7,000 characters asking was tuned with.
export function promptCharsFor(nCtx: number): number {
  return Math.round(((nCtx - 1500) * 7000) / 2596);
}

// The file is mapped into memory, plus its working memory and the app: under 3× the file is tight.
export function lowMemory(e: LocalModelEntry, totalRamBytes: number | null): boolean {
  return totalRamBytes !== null && totalRamBytes < e.bytes * 3;
}
```

- [ ] **Step 4: Run it.** Same command. Expected: PASS.
- [ ] **Step 5: Commit.** `git add src/ai/catalog.ts src/ai/__tests__/catalog.test.ts && git commit -m "feat(ai): a fixed, pinned catalogue of four on-device models"`

---

### Task 2: Prefs: the active model, CPU-only models, ask-with

**Files:**
- Create: `src/ai/localModelPrefs.ts`
- Test: `src/ai/__tests__/localModelPrefs.test.ts`

**Interfaces:**
- Consumes: `entry`, `LocalModelId` (Task 1).
- Produces:
  - `type AskWith = 'built-in' | 'downloaded'`
  - `interface LocalModelPrefs { active: LocalModelId | null; cpuOnly: LocalModelId[]; askWith: AskWith }`
  - `interface PrefsStore { read(): string | null; write(text: string): void }`
  - `createPrefs(store: PrefsStore, isDownloaded: (id: LocalModelId) => boolean): { get(): LocalModelPrefs; update(patch: Partial<LocalModelPrefs>): LocalModelPrefs; markCpuOnly(id: LocalModelId): void }`
  - `prefs` (the app's instance, backed by `models/prefs.json` and `localModel.isDownloaded`; wired in Task 4).

The prefs live in a file beside the models, not in the SQL settings, because `localModel.ts` and `chooseModel` are module-level and have no `services`. They hold no document data.

- [ ] **Step 1: Write the failing test**

```ts
// src/ai/__tests__/localModelPrefs.test.ts
import { createPrefs, PrefsStore } from '../localModelPrefs';

const memory = (initial: string | null = null) => {
  let text = initial;
  const store: PrefsStore = { read: () => text, write: (t) => void (text = t) };
  return { store, text: () => text };
};

test('defaults: nothing active, nothing CPU-only, built-in for asking', () => {
  const p = createPrefs(memory().store, () => false);
  expect(p.get()).toEqual({ active: null, cpuOnly: [], askWith: 'built-in' });
});

test('existing Gemma file becomes the active model', () => {
  const p = createPrefs(memory().store, (id) => id === 'gemma-270m');
  expect(p.get().active).toBe('gemma-270m');
});

test('unknown or corrupt prefs fall back to defaults', () => {
  expect(createPrefs(memory('{not json').store, () => false).get()).toEqual({ active: null, cpuOnly: [], askWith: 'built-in' });
  const p = createPrefs(memory(JSON.stringify({ active: 'phi-3', cpuOnly: ['phi-3', 'qwen3-0.6b'], askWith: 'cloud' })).store, () => true);
  expect(p.get()).toEqual({ active: null, cpuOnly: ['qwen3-0.6b'], askWith: 'built-in' });
});

test('an active model whose file is gone is not active', () => {
  const p = createPrefs(memory(JSON.stringify({ active: 'llama3.2-1b' })).store, () => false);
  expect(p.get().active).toBeNull();
});

test('updates and CPU-only marks persist', () => {
  const m = memory();
  const p = createPrefs(m.store, () => true);
  p.update({ active: 'qwen2.5-0.5b', askWith: 'downloaded' });
  p.markCpuOnly('qwen2.5-0.5b');
  p.markCpuOnly('qwen2.5-0.5b');
  expect(createPrefs(m.store, () => true).get()).toEqual({ active: 'qwen2.5-0.5b', cpuOnly: ['qwen2.5-0.5b'], askWith: 'downloaded' });
});
```

- [ ] **Step 2: Run it.** `npx jest src/ai/__tests__/localModelPrefs.test.ts`. Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```ts
// src/ai/localModelPrefs.ts
import { entry, LocalModelId } from './catalog';

// Which downloaded model is in use, which ones failed on this phone's GPU, and what asking uses.
// Kept in models/prefs.json beside the model files (see localModel.ts); never anything about documents.

export type AskWith = 'built-in' | 'downloaded';

export interface LocalModelPrefs {
  active: LocalModelId | null;
  cpuOnly: LocalModelId[];
  askWith: AskWith;
}

export interface PrefsStore {
  read(): string | null;
  write(text: string): void;
}

const isId = (v: unknown): v is LocalModelId => typeof v === 'string' && entry(v) !== null;

function parse(text: string | null): Partial<LocalModelPrefs> {
  if (!text) return {};
  try {
    const raw = JSON.parse(text) as Record<string, unknown>;
    return {
      active: isId(raw.active) ? raw.active : null,
      cpuOnly: Array.isArray(raw.cpuOnly) ? raw.cpuOnly.filter(isId) : [],
      askWith: raw.askWith === 'downloaded' ? 'downloaded' : 'built-in',
    };
  } catch {
    return {};
  }
}

export function createPrefs(store: PrefsStore, isDownloaded: (id: LocalModelId) => boolean) {
  const get = (): LocalModelPrefs => {
    const saved = parse(store.read());
    // Before the menu there was only Gemma, and no prefs file: a Gemma file on the phone is the active model.
    let active = saved.active === undefined && isDownloaded('gemma-270m') ? 'gemma-270m' : (saved.active ?? null);
    if (active && !isDownloaded(active)) active = null;
    return { active, cpuOnly: saved.cpuOnly ?? [], askWith: saved.askWith ?? 'built-in' };
  };
  const update = (patch: Partial<LocalModelPrefs>): LocalModelPrefs => {
    const next = { ...get(), ...patch };
    store.write(JSON.stringify(next));
    return next;
  };
  return {
    get,
    update,
    markCpuOnly(id: LocalModelId) {
      const { cpuOnly } = get();
      if (!cpuOnly.includes(id)) update({ cpuOnly: [...cpuOnly, id] });
    },
  };
}

export type Prefs = ReturnType<typeof createPrefs>;
```

- [ ] **Step 4: Run it.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(ai): remember the active model, CPU-only models and what asking uses"`

---

### Task 3: GPU first, CPU fallback

**Files:**
- Create: `src/ai/loadWithFallback.ts`
- Test: `src/ai/__tests__/loadWithFallback.test.ts`

**Interfaces:**
- Consumes: `LocalModelEntry` (Task 1).
- Produces:
  - `interface Loaded<C> { context: C; onGpu: boolean }`
  - `loadWithFallback<C extends { gpu: boolean; release(): Promise<void> }>(e: LocalModelEntry, cpuOnly: boolean, init: (nGpuLayers: number) => Promise<C>, markCpuOnly: () => void): Promise<Loaded<C>>`
  - `runWithFallback<C, T>(loaded: Loaded<C>, run: (c: C) => Promise<T>, reloadOnCpu: () => Promise<Loaded<C>>, isAbort: () => boolean): Promise<T>`

- [ ] **Step 1: Write the failing test**

```ts
// src/ai/__tests__/loadWithFallback.test.ts
import { entry } from '../catalog';
import { loadWithFallback, runWithFallback } from '../loadWithFallback';

const ctx = (gpu: boolean) => ({ gpu, release: jest.fn(async () => {}) });
const qwen = entry('qwen2.5-0.5b')!;

test('loads on the GPU when it can', async () => {
  const init = jest.fn(async () => ctx(true));
  const mark = jest.fn();
  const loaded = await loadWithFallback(qwen, false, init, mark);
  expect(init).toHaveBeenCalledWith(99);
  expect(loaded.onGpu).toBe(true);
  expect(mark).not.toHaveBeenCalled();
});

test('a GPU load that throws falls back to CPU and is remembered', async () => {
  const init = jest.fn(async (n: number) => {
    if (n > 0) throw new Error('OpenCL');
    return ctx(false);
  });
  const mark = jest.fn();
  const loaded = await loadWithFallback(qwen, false, init, mark);
  expect(init.mock.calls.map((c) => c[0])).toEqual([99, 0]);
  expect(loaded.onGpu).toBe(false);
  expect(mark).toHaveBeenCalledTimes(1);
});

test('a load that reports no GPU is released, reloaded on CPU and remembered', async () => {
  const first = ctx(false);
  const init = jest.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(ctx(false));
  const mark = jest.fn();
  await loadWithFallback(qwen, false, init, mark);
  expect(first.release).toHaveBeenCalled();
  expect(init.mock.calls.map((c) => c[0])).toEqual([99, 0]);
  expect(mark).toHaveBeenCalled();
});

test('CPU-only models and remembered ones never try the GPU', async () => {
  const init = jest.fn(async () => ctx(false));
  await loadWithFallback(entry('gemma-270m')!, false, init, jest.fn());
  await loadWithFallback(qwen, true, init, jest.fn());
  expect(init.mock.calls.map((c) => c[0])).toEqual([0, 0]);
});

test('a GPU run that throws is retried once on CPU and remembered', async () => {
  const gpu = { context: ctx(true), onGpu: true };
  const cpu = { context: ctx(false), onGpu: false };
  const reload = jest.fn(async () => cpu);
  const run = jest.fn(async (c: { gpu: boolean }) => {
    if (c.gpu) throw new Error('kernel');
    return 'ok';
  });
  await expect(runWithFallback(gpu, run, reload, () => false)).resolves.toBe('ok');
  expect(reload).toHaveBeenCalledTimes(1);
});

test('a CPU run that throws, or a stopped run, is not retried', async () => {
  const reload = jest.fn();
  const fail = async () => {
    throw new Error('x');
  };
  await expect(runWithFallback({ context: ctx(false), onGpu: false }, fail, reload, () => false)).rejects.toThrow('x');
  await expect(runWithFallback({ context: ctx(true), onGpu: true }, fail, reload, () => true)).rejects.toThrow('x');
  expect(reload).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run it.** Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```ts
// src/ai/loadWithFallback.ts
import { LocalModelEntry } from './catalog';

// GPU first (OpenCL on Snapdragon 8 Gen 1 and later), CPU otherwise. A model that fails on this phone's
// GPU is remembered as CPU-only, so it doesn't fail again on every load (ADR 0006).

export interface Loaded<C> {
  context: C;
  onGpu: boolean;
}

const ALL_LAYERS = 99;

export async function loadWithFallback<C extends { gpu: boolean; release(): Promise<void> }>(
  e: LocalModelEntry,
  cpuOnly: boolean,
  init: (nGpuLayers: number) => Promise<C>,
  markCpuOnly: () => void,
): Promise<Loaded<C>> {
  if (e.gpu && !cpuOnly) {
    try {
      const context = await init(ALL_LAYERS);
      if (context.gpu) return { context, onGpu: true };
      await context.release();
    } catch (err) {
      console.warn(`Loading ${e.id} on the GPU failed`, err);
    }
    markCpuOnly();
  }
  return { context: await init(0), onGpu: false };
}

export async function runWithFallback<C, T>(
  loaded: Loaded<C>,
  run: (c: C) => Promise<T>,
  reloadOnCpu: () => Promise<Loaded<C>>,
  isAbort: () => boolean,
): Promise<T> {
  try {
    return await run(loaded.context);
  } catch (err) {
    if (!loaded.onGpu || isAbort()) throw err;
    console.warn('A run on the GPU failed; trying the CPU', err);
    return run((await reloadOnCpu()).context);
  }
}
```

- [ ] **Step 4: Run it.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(ai): load models on the GPU first, falling back to the CPU"`

---

### Task 4: `gemma.ts` → `localModel.ts`, driven by the catalogue

**Files:**
- Rename: `src/analysis/gemma.ts` → `src/analysis/localModel.ts` (`git mv`)
- Modify: `app/edit/[id].tsx:9,74,231`, `src/cards/__tests__/editScreen.test.tsx:5,278,279,494`, `src/ai/models.ts:2`
- Test: `src/analysis/__tests__/localModel.test.ts`

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces (replacing the old exports; old names are removed, not aliased):
  - `modelFile(e: LocalModelEntry): File`, `isDownloaded(id: LocalModelId): boolean`
  - `downloadModel(e: LocalModelEntry, onProgress?, signal?): Promise<void>` (same checks as today: `bytes + 200 MB` free, size and SHA-256)
  - `deleteModel(id: LocalModelId): Promise<void>` (frees the context first if it's that model)
  - `prefs: Prefs` (the app instance from Task 2, store = `models/prefs.json`)
  - `activeEntry(): LocalModelEntry | null`
  - `onGpu(): boolean | null` (null until the active model has loaded)
  - `extractWithLocalModel(cardText, signal?): Promise<ExtractRun>`
  - `generateWithLocalModel(prompt, options, signal): Promise<string>`
  - `localReader: SmartReader` (with `timeoutMs` getter: the active entry's `readTimeoutMs`, else 8,000)
  - `releaseLocalModel(): Promise<void>`
  - `ModelCheckError`, `NoSpaceError` (unchanged)

- [ ] **Step 1: Write the failing test.** Mock `llama.rn` and `expo-file-system`. The test covers: which file loads, which `n_gpu_layers` is used, `enable_thinking: false` for Qwen3, `n_ctx` from the entry, and that deleting the active model releases it first and clears `active`.

```ts
// src/analysis/__tests__/localModel.test.ts
const mockFiles = new Map<string, string>(); // uri → text ('' for a model file)
jest.mock('expo-file-system', () => {
  class File {
    uri: string;
    constructor(dir: { uri: string } | string, name?: string) {
      this.uri = typeof dir === 'string' ? dir : `${dir.uri}/${name}`;
    }
    get exists() { return mockFiles.has(this.uri); }
    get name() { return this.uri.split('/').pop(); }
    textSync() { return mockFiles.get(this.uri) ?? ''; }
    write(t: string) { mockFiles.set(this.uri, t); }
    create() { mockFiles.set(this.uri, ''); }
    delete() { mockFiles.delete(this.uri); }
  }
  class Directory {
    uri: string;
    constructor(base: { uri: string }, name: string) { this.uri = `${base.uri}/${name}`; }
    create() {}
  }
  return { File, Directory, Paths: { document: { uri: 'doc' }, availableDiskSpace: 1e12 } };
});
const mockInit = jest.fn();
const mockRelease = jest.fn(async () => {});
const mockCompletion = jest.fn(async () => ({ text: '{}', timings: { prompt_ms: 1, predicted_ms: 1, predicted_per_second: 1 } }));
jest.mock('llama.rn', () => ({
  initLlama: (p: { n_gpu_layers: number }) => mockInit(p),
}));

import * as local from '../localModel';
import { entry } from '../../ai/catalog';

beforeEach(async () => {
  await local.releaseLocalModel();
  mockFiles.clear();
  mockInit.mockReset().mockImplementation(async (p: { n_gpu_layers: number }) => ({
    gpu: p.n_gpu_layers > 0, release: mockRelease, completion: mockCompletion, stopCompletion: jest.fn(),
  }));
  mockCompletion.mockClear();
});

const download = (id: string) => mockFiles.set(local.modelFile(entry(id)!).uri, '');

test('loads the active entry with its context and GPU setting', async () => {
  download('qwen3-0.6b');
  local.prefs.update({ active: 'qwen3-0.6b' });
  await local.generateWithLocalModel({ system: 's', user: 'u' }, { maxTokens: 8, schema: {} }, new AbortController().signal);
  expect(mockInit).toHaveBeenCalledWith(expect.objectContaining({ n_ctx: 4096, n_gpu_layers: 99, model: expect.stringContaining('Qwen3-0.6B-Q6_K.gguf') }));
  expect(mockCompletion).toHaveBeenCalledWith(expect.objectContaining({ enable_thinking: false }));
  expect(local.onGpu()).toBe(true);
});

test('Gemma loads on the CPU and gets no thinking flag', async () => {
  download('gemma-270m');
  local.prefs.update({ active: 'gemma-270m' });
  await local.generateWithLocalModel({ system: 's', user: 'u' }, { maxTokens: 8, schema: {} }, new AbortController().signal);
  expect(mockInit).toHaveBeenCalledWith(expect.objectContaining({ n_gpu_layers: 0 }));
  expect(mockCompletion.mock.calls[0][0]).not.toHaveProperty('enable_thinking');
});

test('switching the active model releases the old one before loading the new', async () => {
  download('gemma-270m');
  download('qwen2.5-0.5b');
  local.prefs.update({ active: 'gemma-270m' });
  await local.generateWithLocalModel({ system: 's', user: 'u' }, { maxTokens: 8, schema: {} }, new AbortController().signal);
  local.prefs.update({ active: 'qwen2.5-0.5b' });
  await local.generateWithLocalModel({ system: 's', user: 'u' }, { maxTokens: 8, schema: {} }, new AbortController().signal);
  expect(mockRelease).toHaveBeenCalledTimes(1);
  expect(mockInit).toHaveBeenLastCalledWith(expect.objectContaining({ model: expect.stringContaining('qwen2.5') }));
});

test('deleting the active model picks another downloaded one or none', async () => {
  download('gemma-270m');
  download('llama3.2-1b');
  local.prefs.update({ active: 'llama3.2-1b' });
  await local.deleteModel('llama3.2-1b');
  expect(local.prefs.get().active).toBe('gemma-270m');
  await local.deleteModel('gemma-270m');
  expect(local.prefs.get().active).toBeNull();
});

test('the reader reads nothing when no model is active', async () => {
  expect(await local.localReader.read('text', new AbortController().signal)).toBeNull();
  expect(mockInit).not.toHaveBeenCalled();
});
```

(Adjust the `File` mock to whichever `expo-file-system` methods the implementation uses for prefs: `textSync()` / `write()`. Keep the two in step.)

- [ ] **Step 2: Run it.** `npx jest src/analysis/__tests__/localModel.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement.** `git mv src/analysis/gemma.ts src/analysis/localModel.ts`, then change it like this:
  - `modelDir()` is unchanged. `modelFile(e) = new File(modelDir(), e.file)`. `partFile(e) = new File(modelDir(), e.file + '.part')`.
  - `downloadModel(e, …)` is today's body with `MODEL_URL/MODEL_BYTES/MODEL_SHA256` replaced by `e.url/e.bytes/e.sha256`.
  - `prefs = createPrefs({ read: () => (f.exists ? f.textSync() : null), write: (t) => { modelDir().create({ intermediates: true, idempotent: true }); f.write(t); } }, isDownloaded)` where `f = new File(modelDir(), 'prefs.json')`.
  - Module state: `let loaded: Promise<Loaded<LlamaContext>> | null` and `let loadedId: LocalModelId | null`.
  - `load()`:
    1. `const e = activeEntry()`. Throw `new Error('No model is active')` if it's null.
    2. If `loadedId !== e.id`, release the old context and clear `loaded`.
    3. `loaded ??= loadWithFallback(e, prefs.get().cpuOnly.includes(e.id), (n) => initLlama({ model: modelFile(e).uri, n_ctx: e.nCtx, n_gpu_layers: n, use_mlock: false }), () => prefs.markCpuOnly(e.id))`. On rejection, reset `loaded` to null, as `context.catch` does today.
  - `complete(params, signal)` runs through `runWithFallback(await load(), (c) => c.completion(params), reloadOnCpu, () => signal?.aborted ?? false)`.
    - `reloadOnCpu` releases the context, marks the model CPU-only, and loads again.
    - Add `enable_thinking: e.thinking` to `params` only when `e.thinking !== null`.
  - `extractWithLocalModel` / `generateWithLocalModel` keep today's bodies (and `serially`) but call `complete`.
  - `deleteModel(id)`:
    1. Run `releaseLocalModel()` if `loadedId === id`.
    2. Delete the file and its `.part`.
    3. If `prefs.get().active` was `id`, set it to the first other `CATALOG` id that `isDownloaded`, or `null`.
  - `localReader = { read: (t, s) => (activeEntry() ? extractWithLocalModel(t, s).then((r) => r.suggestion) : Promise.resolve(null)), get timeoutMs() { return activeEntry()?.readTimeoutMs ?? 8_000; } }`.
  - `onGpu()` returns the last settled `Loaded.onGpu` for the active id, else `null`. Store it in a variable when the load resolves.
  - Rename the remaining exports per **Interfaces**, update the header comment, and update the callers: `app/edit/[id].tsx` uses `localReader` and `releaseLocalModel`, and so does `editScreen.test.tsx`.

- [ ] **Step 4: Run.** `npx jest && npm run typecheck`. Expected: PASS. (`models.ts` and `modelDownload.ts` still import old names until Tasks 5–6. Fix their imports minimally here so typecheck passes: `generateWithLocalModel`, and `isDownloaded('gemma-270m')` in place of `modelFile().exists`.)
- [ ] **Step 5: Commit.** `git commit -m "refactor(ai): run whichever catalogue model is active, GPU first"`

---

### Task 5: Download store per model, one at a time

**Files:**
- Modify: `src/analysis/modelDownload.ts`
- Modify: `src/analysis/__tests__/modelDownload.test.ts` (rewrite the mock of `../localModel`)

**Interfaces:**
- Consumes: `downloadModel`, `deleteModel`, `isDownloaded`, `prefs` (Task 4); `CATALOG` (Task 1).
- Produces:
  - `type ModelState = { status: 'absent'; failure?: ModelFailure } | { status: 'downloading'; progress: number | null } | { status: 'queued' } | { status: 'present' }`
  - `interface MenuState { models: Record<LocalModelId, ModelState>; active: LocalModelId | null; askWith: AskWith }`
  - `useMenuState(): MenuState`
  - `startModelDownload(id)`, `cancelModelDownload(id)`, `removeModel(id)`, `setActive(id)`, `setAskWith(w)`

Decision: a second download tap while one is running is **disabled**, not queued. That's simpler and matches "one download at a time". `queued` is therefore left out of `ModelState`. When a download finishes and nothing is active, the new model becomes active.

- [ ] **Step 1: Write the failing tests** (add to the existing file, keeping its manual-download style):

```ts
test('a second model cannot start while one is downloading', async () => {
  void store.startModelDownload('qwen2.5-0.5b');
  await store.startModelDownload('llama3.2-1b');
  expect(mockDownloads).toHaveLength(1);
});

test('the first finished download becomes the active model; later ones do not', async () => {
  const done = store.startModelDownload('qwen2.5-0.5b');
  mockDownloads[0].resolve();
  await done;
  expect(menu().active).toBe('qwen2.5-0.5b');
  const second = store.startModelDownload('gemma-270m');
  mockDownloads[1].resolve();
  await second;
  expect(menu().active).toBe('qwen2.5-0.5b');
});

test('choosing a model and the ask-with switch are remembered', async () => {
  mockPresent.add('gemma-270m');
  await act(() => store.setActive('gemma-270m'));
  await act(() => store.setAskWith('downloaded'));
  expect(menu()).toMatchObject({ active: 'gemma-270m', askWith: 'downloaded' });
});

test('failures are per model', async () => {
  const done = store.startModelDownload('qwen3-0.6b');
  mockDownloads[0].reject(new mockNoSpaceError());
  await done;
  expect(menu().models['qwen3-0.6b']).toEqual({ status: 'absent', failure: 'space' });
  expect(menu().models['llama3.2-1b']).toEqual({ status: 'absent' });
});
```

(Here `menu()` reads `renderHook(() => store.useMenuState()).result.current`. `mockDownloads` is an array of `{ id, progress, resolve, reject, signal }` filled by the mocked `downloadModel(e, …)`. `mockPresent` is a `Set<LocalModelId>` behind the mocked `isDownloaded`. The mocked `prefs` is an in-memory `createPrefs` from the real Task 2 module.)

- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** Keep the current structure: module state, `useSyncExternalStore`, and the same object returned while nothing changes. The changes:
  - Keep a `downloading: { id, progress } | null` plus `failures: Partial<Record<LocalModelId, ModelFailure>>`.
  - `current()` builds `MenuState` from `isDownloaded`, `downloading`, `failures` and `prefs.get()`, and caches it by a key string (`JSON.stringify` of the parts) so the identity is stable.
  - `startModelDownload(id)` returns early if `downloading` is set or `isDownloaded(id)`. On success, if `prefs.get().active === null`, it calls `prefs.update({ active: id })`.
  - `setActive(id)` throws if `!isDownloaded(id)`; otherwise it calls `prefs.update({ active: id })` and then `releaseLocalModel()`, so the next job loads the new one. `setAskWith(w)` calls `prefs.update({ askWith: w })`. Both notify listeners.
- [ ] **Step 4: Run.** `npx jest src/analysis && npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(ai): download each menu model separately, one at a time"`

---

### Task 6: Asking and card reading use the active model

**Files:**
- Modify: `src/ai/model.ts:6` (`kind: 'built-in' | 'local'`), `src/ai/models.ts`, `src/analysis/types.ts:29-31`, `src/analysis/analyze.ts:83-92`
- Test: `src/ai/__tests__/models.test.ts` (new), `src/analysis/__tests__/cardReading.test.ts` (add one case)

**Interfaces:**
- Consumes: `activeEntry`, `generateWithLocalModel`, `prefs` (Task 4); `promptCharsFor` (Task 1).
- Produces: `chooseModel(): Promise<ModelChoice>` (same signature). `SmartReader.timeoutMs?: number`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/ai/__tests__/models.test.ts
let mockStatus = 'available';
let mockActive: ReturnType<typeof import('../catalog').entry> = null;
let mockAskWith = 'built-in';
jest.mock('expo', () => ({
  requireOptionalNativeModule: () => ({ availability: async () => mockStatus, prepare: jest.fn(), generate: jest.fn(), cancel: jest.fn() }),
}));
jest.mock('../../analysis/localModel', () => ({
  activeEntry: () => mockActive,
  generateWithLocalModel: jest.fn(),
  prefs: { get: () => ({ askWith: mockAskWith }) },
}));
import { entry, promptCharsFor } from '../catalog';
import { chooseModel } from '../models';

test('built-in first by default', async () => {
  mockActive = entry('qwen2.5-0.5b');
  expect(await chooseModel()).toMatchObject({ status: 'ready', model: { kind: 'built-in' } });
});

test('"Ask with: downloaded" uses the active model even when built-in is ready', async () => {
  mockAskWith = 'downloaded';
  mockActive = { ...entry('llama3.2-1b')!, nCtx: 8192 };
  expect(await chooseModel()).toMatchObject({ status: 'ready', model: { kind: 'local', promptChars: promptCharsFor(8192) } });
});

test('"Ask with: downloaded" with nothing downloaded falls back to built-in', async () => {
  mockAskWith = 'downloaded';
  mockActive = null;
  expect(await chooseModel()).toMatchObject({ status: 'ready', model: { kind: 'built-in' } });
});

test('no built-in and no model: needs a download', async () => {
  mockStatus = 'unsupported';
  mockActive = null;
  expect(await chooseModel()).toEqual({ status: 'unavailable', reason: 'needs-download' });
});
```

```ts
// add to src/analysis/__tests__/cardReading.test.ts, following its existing analyzeImage fake-timer cases
test('the smart reader's timeout comes from the active model', async () => {
  // a reader that answers after 10 s, with timeoutMs 12_000, still fills the gaps;
  // the same reader with no timeoutMs (8 s default) times out and the rules' result stands.
});
```

Write this second test in the style of the existing timeout test in `cardReading.test.ts`, copying its fake-timer setup. Both halves are required.

- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement**
  - `src/analysis/types.ts`: `export interface SmartReader { read(…); timeoutMs?: number }`.
  - `src/analysis/analyze.ts`: the default becomes `smartTimeoutMs = smart?.timeoutMs ?? SMART_TIMEOUT_MS`. Keep the explicit option winning for tests.
  - `src/ai/models.ts`:

```ts
const localModel = (e: LocalModelEntry): AskModel => ({
  kind: 'local',
  promptChars: promptCharsFor(e.nCtx),
  generate: generateWithLocalModel,
});

// The built-in model first, unless the user chose the downloaded one in Settings (and has one);
// otherwise whichever is ready.
export async function chooseModel(): Promise<ModelChoice> {
  const status = await builtInStatus();
  const active = activeEntry();
  if (active && prefs.get().askWith === 'downloaded') return { status: 'ready', model: localModel(active) };
  if (status === 'available') return { status: 'ready', model: builtInModel };
  if (active) return { status: 'ready', model: localModel(active) };
  if (status === 'downloadable') return { status: 'unavailable', reason: 'built-in-downloadable' };
  if (status === 'downloading') return { status: 'unavailable', reason: 'built-in-preparing' };
  if (status === 'off') return { status: 'unavailable', reason: 'built-in-off' };
  return { status: 'unavailable', reason: 'needs-download' };
}
```

  The built-in model keeps `PROMPT_CHARS = 7000`. Update the comments in `model.ts` that say "Gemma" to say "the downloaded model".
- [ ] **Step 4: Run.** `npx jest && npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(ai): ask and read cards with the active model; per-model context and time limit"`

---

### Task 7: Settings → AI becomes the model menu

**Files:**
- Modify: `app/settings.tsx:148-201` (`AiSection`), `src/strings.ts:366-388` (`ai`)
- Modify: `package.json` (add `expo-device` via `npx expo install expo-device`)
- Test: `src/analysis/__tests__/settingsAi.test.tsx`

**Interfaces:**
- Consumes: `useMenuState`, `startModelDownload`, `cancelModelDownload`, `removeModel`, `setActive`, `setAskWith` (Task 5); `CATALOG`, `RECOMMENDED`, `lowMemory` (Task 1); `onGpu` (Task 4); `builtInStatus` (`src/ai/models.ts`); `Device.totalMemory` (`expo-device`).

Before building the UI, load the `spotify-design` and `button-placement` skills. The section has these rows, top to bottom:
1. `strings.ai.about`.
2. One row per `CATALOG` entry, showing:
   - its name, plus a "Recommended" pill for `RECOMMENDED`
   - a one-line note (`strings.ai.notes[id]`)
   - the size (`formatMb(e.bytes)`)
   - the low-memory warning when `lowMemory(e, Device.totalMemory)`
   - state: Download / progress + Stop / "In use" / Use + Delete
   - while another model is downloading, Download is disabled with `strings.ai.oneAtATime` as its hint
3. If the active model has loaded, `strings.ai.runningOn(onGpu())`.
4. If `builtInStatus()` is not `'unsupported'` and a model is active, the "Ask with" chips: Built-in / the active model's name.
5. The active model's `license`.

New strings (exact text):

```ts
ai: {
  title: 'AI models',
  about: 'Doc Keeper can suggest a document\'s name, expiry date and type, and answer questions about your documents, using an AI model that runs on this phone. Pick one to download. Your documents are never sent anywhere.',
  recommended: 'Recommended',
  notes: {
    'gemma-270m': 'Fastest, least accurate.',
    'qwen2.5-0.5b': 'Good all-rounder.',
    'qwen3-0.6b': 'Smarter, a little slower.',
    'llama3.2-1b': 'Best answers. Needs a newer phone.',
  },
  size: (mb: number) => `${mb} MB`,
  lowMemory: 'May be slow or close on this phone.',
  download: 'Download',
  oneAtATime: 'Another model is downloading.',
  confirmTitle: (name: string) => `Download ${name}?`,
  confirmMessage: (mb: number) => `Doc Keeper will download about ${mb} MB from Hugging Face, once. Nothing about your documents is sent. Use Wi-Fi if your data plan is limited.`,
  confirm: 'Download',
  downloading: (percent: number | null) => (percent === null ? 'Downloading…' : `Downloading… ${percent}%`),
  stop: 'Stop',
  inUse: 'In use',
  use: 'Use',
  remove: 'Delete',
  removeTitle: (name: string) => `Delete ${name}?`,
  removeMessage: 'You can download it again at any time.',
  runningOn: (gpu: boolean) => (gpu ? 'Running on GPU.' : 'Running on CPU.'),
  askWith: 'Answer questions with',
  askWithBuiltIn: "This phone's AI",
  failed: { /* unchanged */ },
},
```

- [ ] **Step 1: Write the failing tests.** Rewrite the `modelDownload` mock in `settingsAi.test.tsx` to expose `useMenuState` and the five actions. Mock `expo-device` as `{ totalMemory: mockRam }`. Cases:
  - all four names render; "Recommended" appears once, on Qwen2.5
  - tapping Download on Llama shows an alert whose message contains `1022 MB`, and Confirm calls `startModelDownload('llama3.2-1b')`
  - while `qwen3-0.6b` is downloading, the other Download buttons are disabled and the progress text shows `Downloading… 42%`
  - with `mockRam = 3e9`, Llama shows the low-memory line and Gemma doesn't
  - a present, inactive model shows Use; tapping it calls `setActive`
  - the active one shows "In use"
  - Delete confirms, then calls `removeModel(id)`
  - the Ask-with chips are hidden when `builtInStatus` is `'unsupported'`; otherwise tapping the model's chip calls `setAskWith('downloaded')`
  - a failure on one model shows its message on that row only
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** `AiSection` as `ModelRow` components inside it. Put `formatMb = (b: number) => Math.round(b / 1e6)` next to `ModelRow`. Use the existing `Button`, `Text`, `LiveText`, `ChipRow`/`TagPill` components (check `src/ui/ChipRow.tsx` for the chip API) and theme tokens; add no new colours. Read `builtInStatus()` once in a `useEffect` on mount.
- [ ] **Step 4: Run.** `npx jest && npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(settings): choose, download and switch between on-device models"`

---

### Task 8: Turn on OpenCL in the Android build

**Files:**
- Modify: `app.json` (the `llama.rn` plugin options; `expo-build-properties.android.packagingOptions.exclude`)
- Modify: `plugins/withSmallerApk.js` (header comment)

- [ ] **Step 1: Measure the current APK.** Run `scripts/release-android.sh` (or a local `./gradlew assembleRelease` after `npx expo prebuild -p android --clean`) and note the APK size. Don't edit `src/` or `app/` while it runs.
- [ ] **Step 2: Change `app.json`.**
  - The `llama.rn` plugin options become `{ "enableEntitlements": false, "enableOpenCLAndHexagon": true }`. Drop the deprecated `enableOpenCL`: the plugin skips the manifest entries if either option is false.
  - In `packagingOptions.exclude`, remove the two lines `**/librnllama_v8_2_dotprod_i8mm_hexagon_opencl.so` and `**/librnllama_jni_v8_2_dotprod_i8mm_hexagon_opencl.so`.
  - Keep the `ggml-hexagon` asset exclusion in `withSmallerApk.js`: the NPU isn't used. Update its comment to say the OpenCL engine is now kept for the GPU and only the Hexagon NPU add-ons are dropped.
- [ ] **Step 3: Prebuild and check the manifest.** Run `npx expo prebuild -p android --clean && grep -n "libOpenCL" android/app/src/main/AndroidManifest.xml`. Expected: a `uses-native-library … libOpenCL.so … required="false"` line.
- [ ] **Step 4: Build again and measure.** Note the new APK size; the expected increase is about 5 MB.
- [ ] **Step 5: Check on a phone.** Install on a Snapdragon 8 Gen 1+ phone and a Pixel, download Qwen2.5 on each, and read one card.
  - Expected `adb logcat -s RNLlama`: `rnllama_jni_v8_2_dotprod_i8mm_hexagon_opencl` loaded on the Snapdragon, `…v8_2_dotprod` on the Pixel.
  - Settings shows "Running on GPU" on the Snapdragon and "Running on CPU" on the Pixel.
  - If the HTP assets being missing stops the OpenCL library from loading on the Snapdragon (look for `Failed to extract HTP libraries` followed by a load failure), stop and report it: the fix is either to keep the `ggml-hexagon` assets or to give up the GPU, and that's the owner's call.
- [ ] **Step 6: Commit.** `git commit -m "build(android): keep llama.rn's OpenCL engine for the GPU (+N MB APK)"`, with the measured before/after sizes in the body.

---

### Task 9: The bench: compare models, tune context and time limits

**Files:**
- Rename: `app/dev/gemma.tsx` → `app/dev/models.tsx`
- Create: `src/ai/eval/cases.ts`, `src/ai/eval/score.ts`, `src/ai/__tests__/score.test.ts`
- Rename: `docs/gemma-sample.md` → `docs/model-bench.md`

**Interfaces:**
- Consumes: everything above. Also `answer` from `src/ai/ask.ts` (read its exported entry point and input type at the top of the file before wiring).
- Produces:
  - `interface CardCase { id: string; text: string; expect: { name?: string; expiresOn?: string; category?: string } }`
  - `interface AskCase { id: string; question: string; docs: { title: string; markdown: string }[]; expect: string }`
  - `scoreCard(c: CardCase, s: SmartSuggestion | null): { fields: number; correct: number }` and `scoreAnswer(c: AskCase, answer: string | null): boolean`

- [ ] **Step 1: Write the failing scorer test**

```ts
// src/ai/__tests__/score.test.ts
import { scoreAnswer, scoreCard } from '../eval/score';

test('counts expected card fields matched, ignoring case and spacing', () => {
  const c = { id: 'x', text: '', expect: { name: 'Emirates ID', expiresOn: '2027-05-31' } };
  expect(scoreCard(c, { name: ' emirates id', expiresOn: '2027-05-31', category: null } as never)).toEqual({ fields: 2, correct: 2 });
  expect(scoreCard(c, null)).toEqual({ fields: 2, correct: 0 });
});

test('an answer counts when it contains the expected value', () => {
  const c = { id: 'q', question: '', docs: [], expect: '784-1990-1234567-1' };
  expect(scoreAnswer(c, 'The ID number is 784-1990-1234567-1.')).toBe(true);
  expect(scoreAnswer(c, null)).toBe(false);
});
```

- [ ] **Step 2: Run.** Expected: FAIL. **Step 3:** Implement `score.ts`: lowercase, collapse whitespace, compare `trim()`med strings for card fields, and use `includes` for answers. **Step 4:** PASS.

- [ ] **Step 5: Build the cases.** The case text has to come from real documents. For each of the four documents in `dataSet/`:
  1. Add it in a dev build, open its Details (.md), and copy the recognised text into a `CardCase`, with the expected name, expiry and category taken from the document itself.
  2. Write three questions per document whose answers are printed on it, as `AskCase`s, with the document's Markdown as `docs`.

  That makes 4 card cases and 12 ask cases. No document text from a real person goes in: use the sample documents only, and leave out any case whose source is a personal document.

- [ ] **Step 6: Rework the bench screen.** It gets:
  - a model picker (downloaded models only) and an `n_ctx` picker (4096 / 8192)
  - a **Run all** button that runs every card case through `extractWithLocalModel` and every ask case through `ask.ts`, recording `validJson`, the scores, `promptMs` and `predictMs`
  - a results table, plus **Copy as Markdown**

  The `n_ctx` override goes through a dev-only `setContextOverride(n: number | null)` in `localModel.ts`. It must be ignored when `!__DEV__`, and covered by one test in `localModel.test.ts`.

- [ ] **Step 7: Run the matrix** on a Snapdragon 8 Gen 1+ phone and a Pixel: 4 models × 4,096, plus Qwen2.5 and Llama at 8,192. Paste both tables into `docs/model-bench.md` with the date and the phone models.
- [ ] **Step 8: Apply the results, then stop for the owner.**
  - Set each entry's `nCtx` and `readTimeoutMs` to the measured values: `readTimeoutMs` = 1.5× the slowest card read on the Pixel, rounded up to 1 s.
  - Propose removing any model whose card-field and answer accuracy doesn't beat `gemma-270m`, but don't remove it yet.
  - Show the owner the table and the proposal; this is decision 11 and it's theirs.
- [ ] **Step 9: Commit.** `git commit -m "feat(dev): bench all menu models; tune context and time limits from it"`

---

### Task 10: Docs

**Files:**
- Create: `docs/adr/0006-a-fixed-menu-of-on-device-models.md`
- Modify: `docs/adr/0005-no-network-unless-the-user-starts-it.md`, `docs/adr/0001-built-in-models-only-for-asking.md`, `docs/design.md:62,66`, `GLOSSARY.md` (if it defines Gemma or "AI model")

- [ ] **Step 1:** Write ADR 0006 in the house style, with status `accepted 2026-11-10`:
  - **Context:** Gemma 270M misses answers. The owner wants ~0.5B models and a menu.
  - **Decision:** decisions 2–10 above.
  - **Considered Options:** a fetched catalogue (rejected, ADR 0005); Q4_0 (rejected, accuracy); Q8_0 (rejected, can't run on the GPU); Phi/Mistral (smallest is 3B or more); keeping Gemma for card reading only (rejected, two downloads).
  - **Consequences:** about 5 MB more APK; the GPU only on Snapdragon 8 Gen 1+; four licences; the bench results table linked.
- [ ] **Step 2:** In ADR 0005, replace "the one-time Gemma model download from Hugging Face" with "a model download from Hugging Face, one per model the user picks in Settings → AI models, after a confirmation that states its size and source". In ADR 0001, add a line under Amended pointing to ADR 0006.
- [ ] **Step 3:** In `docs/design.md`, rewrite the AI-suggestions bullet as "AI models" (the menu, one download at a time, GPU/CPU line, licences) and change "the downloaded Gemma" to "the downloaded model" in the Ask bullet.
- [ ] **Step 4:** Run `grep -rn "Gemma" docs src app --include=*.md --include=*.ts --include=*.tsx`. Every remaining hit should be about the Gemma *entry* specifically.
- [ ] **Step 5: Commit.** `git commit -m "docs: ADR 0006, a fixed menu of on-device models"`

---

## Self-review

- **Spec coverage:**

  | Decision | Where |
  |---|---|
  | 1 (Android, iOS unchanged) | Task 4 (CPU when there's no GPU) and Task 8 (Android only) |
  | 2 | Task 1 |
  | 3 | Task 1 |
  | 4 | Tasks 5 and 7 |
  | 5 | Task 5 |
  | 6 | Tasks 1 and 7 |
  | 7 | Tasks 3, 4, 7 and 8 |
  | 8 | Tasks 4 and 6 |
  | 9 | Tasks 2, 5, 6 and 7 |
  | 10 | Tasks 1, 6 and 9 |
  | 11 | Task 9 |
  | 12 | Task 10 |

- **Gaps found and fixed:** a GPU result shown before any load (`onGpu()` returns null, and the line is hidden); card reading's 8 s limit for bigger models (`readTimeoutMs`); the OpenCL library stripped by the APK-shrink commit (Task 8).
- **Names checked across tasks:** `generateWithLocalModel`, `extractWithLocalModel`, `localReader`, `releaseLocalModel`, `activeEntry`, `isDownloaded`, `prefs`, `useMenuState`, `setActive`, `setAskWith`.

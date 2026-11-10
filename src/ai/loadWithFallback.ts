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

// A run that fails on the GPU (driver bugs show up here, not at load) is tried once more on the CPU.
// Only if the CPU then succeeds was it the GPU's fault, and the model is remembered as CPU-only; an
// error the CPU shares (a prompt too long, say) costs nothing. A stopped run is not retried, and a
// stop that comes while reloading ends it before the CPU run starts.
export async function runWithFallback<C, T>(
  loaded: Loaded<C>,
  run: (c: C) => Promise<T>,
  reloadOnCpu: () => Promise<Loaded<C>>,
  isAbort: () => boolean,
  markCpuOnly: () => void,
): Promise<T> {
  try {
    return await run(loaded.context);
  } catch (err) {
    if (!loaded.onGpu || isAbort()) throw err;
    console.warn('A run on the GPU failed; trying the CPU', err);
    const cpu = await reloadOnCpu();
    if (isAbort()) throw err;
    const result = await run(cpu.context);
    markCpuOnly();
    return result;
  }
}

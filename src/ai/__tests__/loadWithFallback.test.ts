import { entry } from '../catalog';
import { loadWithFallback, runWithFallback } from '../loadWithFallback';

const ctx = (gpu: boolean) => ({ gpu, release: jest.fn(async () => {}) });
const qwen = entry('qwen2.5-0.5b')!;

beforeEach(() => jest.spyOn(console, 'warn').mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

test('loads on the GPU when it can', async () => {
  const init = jest.fn(async (_n: number) => ctx(true));
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
  const init = jest.fn(async (_n: number) => ctx(false));
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
  const mark = jest.fn();
  await expect(runWithFallback(gpu, run, reload, () => false, mark)).resolves.toBe('ok');
  expect(reload).toHaveBeenCalledTimes(1);
  expect(mark).toHaveBeenCalledTimes(1);
});

test('a run that fails on the CPU too was not the GPU\'s fault: the model is not marked CPU-only', async () => {
  const mark = jest.fn();
  const fail = async () => {
    throw new Error('prompt too long');
  };
  await expect(runWithFallback({ context: ctx(true), onGpu: true }, fail, async () => ({ context: ctx(false), onGpu: false }), () => false, mark)).rejects.toThrow('prompt too long');
  expect(mark).not.toHaveBeenCalled();
});

test('a stop that comes while reloading on the CPU is not run', async () => {
  let stopped = false;
  const run = jest.fn(async (c: { gpu: boolean }) => {
    if (c.gpu) throw new Error('kernel');
    return 'ok';
  });
  const reload = async () => {
    stopped = true;
    return { context: ctx(false), onGpu: false };
  };
  await expect(runWithFallback({ context: ctx(true), onGpu: true }, run, reload, () => stopped, jest.fn())).rejects.toThrow('kernel');
  expect(run).toHaveBeenCalledTimes(1);
});

test('a CPU run that throws, or a stopped run, is not retried', async () => {
  const reload = jest.fn();
  const fail = async () => {
    throw new Error('x');
  };
  await expect(runWithFallback({ context: ctx(false), onGpu: false }, fail, reload, () => false, jest.fn())).rejects.toThrow('x');
  await expect(runWithFallback({ context: ctx(true), onGpu: true }, fail, reload, () => true, jest.fn())).rejects.toThrow('x');
  expect(reload).not.toHaveBeenCalled();
});

// The real module loads llama.cpp and files of hundreds of MB; here both are fakes.
const mockFiles = new Map<string, string>(); // uri → text ('' for a model file)
jest.mock('expo-file-system', () => {
  class File {
    uri: string;
    constructor(dir: { uri: string } | string, name?: string) {
      this.uri = typeof dir === 'string' ? dir : `${dir.uri}/${name}`;
    }
    get exists() {
      return mockFiles.has(this.uri);
    }
    get name() {
      return this.uri.split('/').pop();
    }
    textSync() {
      return mockFiles.get(this.uri) ?? '';
    }
    writeSync(t: string) {
      mockFiles.set(this.uri, t);
    }
    delete() {
      mockFiles.delete(this.uri);
    }
  }
  class Directory {
    uri: string;
    constructor(base: { uri: string }, name: string) {
      this.uri = `${base.uri}/${name}`;
    }
    create() {}
  }
  return { File, Directory, Paths: { document: { uri: 'doc' }, availableDiskSpace: 1e12 } };
});
const mockInit = jest.fn();
const mockRelease = jest.fn(async () => {});
const mockCompletion = jest.fn(async (_params: object) => ({
  text: '{}',
  timings: { prompt_ms: 1, predicted_ms: 1, predicted_per_second: 1 },
}));
jest.mock('llama.rn', () => ({
  initLlama: (p: { n_gpu_layers: number }) => mockInit(p),
}));

import { Platform } from 'react-native';
import { entry } from '../../ai/catalog';
import * as local from '../localModel';

let mockOS = 'android';
Object.defineProperty(Platform, 'OS', { get: () => mockOS, configurable: true });

const signal = () => new AbortController().signal;
const ask = () => local.generateWithLocalModel({ system: 's', user: 'u' }, { maxTokens: 8, schema: {} }, signal());
const download = (id: string) => mockFiles.set(local.modelFile(entry(id)!).uri, '');

beforeEach(async () => {
  mockOS = 'android';
  await local.releaseLocalModel();
  mockFiles.clear();
  mockRelease.mockClear();
  mockInit.mockReset().mockImplementation(async (p: { n_gpu_layers: number }) => ({
    gpu: p.n_gpu_layers > 0,
    release: mockRelease,
    completion: mockCompletion,
    stopCompletion: jest.fn(),
  }));
  mockCompletion.mockClear();
});

test('loads the active entry with its context and GPU setting', async () => {
  download('qwen3-0.6b');
  local.prefs.update({ active: 'qwen3-0.6b' });
  await ask();
  expect(mockInit).toHaveBeenCalledWith(
    expect.objectContaining({ n_ctx: 4096, n_gpu_layers: 99, model: expect.stringContaining('Qwen3-0.6B-Q6_K.gguf') }),
  );
  expect(mockCompletion).toHaveBeenCalledWith(expect.objectContaining({ enable_thinking: false }));
  expect(local.onGpu()).toBe(true);
});

test('Gemma loads on the CPU and gets no thinking flag', async () => {
  download('gemma-270m');
  local.prefs.update({ active: 'gemma-270m' });
  await ask();
  expect(mockInit).toHaveBeenCalledWith(expect.objectContaining({ n_gpu_layers: 0 }));
  expect(mockCompletion.mock.calls[0][0]).not.toHaveProperty('enable_thinking');
  expect(local.onGpu()).toBe(false);
});

test('switching the active model releases the old one before loading the new', async () => {
  download('gemma-270m');
  download('qwen2.5-0.5b');
  local.prefs.update({ active: 'gemma-270m' });
  await ask();
  local.prefs.update({ active: 'qwen2.5-0.5b' });
  await ask();
  expect(mockRelease).toHaveBeenCalledTimes(1);
  expect(mockInit).toHaveBeenLastCalledWith(expect.objectContaining({ model: expect.stringContaining('qwen2.5') }));
});

test('a run that fails on the GPU is retried on the CPU, and the model is remembered as CPU-only', async () => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  download('llama3.2-1b');
  local.prefs.update({ active: 'llama3.2-1b' });
  mockCompletion.mockRejectedValueOnce(new Error('kernel'));
  await expect(ask()).resolves.toBe('{}');
  expect(mockInit.mock.calls.map((c) => c[0].n_gpu_layers)).toEqual([99, 0]);
  expect(local.prefs.get().cpuOnly).toEqual(['llama3.2-1b']);
  expect(local.onGpu()).toBe(false);
  jest.restoreAllMocks();
});

test('deleting the active model picks another downloaded one or none', async () => {
  download('gemma-270m');
  download('llama3.2-1b');
  local.prefs.update({ active: 'llama3.2-1b' });
  await ask();
  await local.deleteModel('llama3.2-1b');
  expect(mockRelease).toHaveBeenCalledTimes(1);
  expect(local.isDownloaded('llama3.2-1b')).toBe(false);
  expect(local.prefs.get().active).toBe('gemma-270m');
  await local.deleteModel('gemma-270m');
  expect(local.prefs.get().active).toBeNull();
});

test('the reader reads nothing when no model is active, and its time limit follows the model', async () => {
  expect(await local.localReader.read('text', signal())).toBeNull();
  expect(mockInit).not.toHaveBeenCalled();
  expect(local.localReader.timeoutMs).toBe(8_000);
  download('llama3.2-1b');
  local.prefs.update({ active: 'llama3.2-1b' });
  expect(local.localReader.timeoutMs).toBe(20_000);
});

test('a context override is used in development builds', async () => {
  download('qwen2.5-0.5b');
  local.prefs.update({ active: 'qwen2.5-0.5b' });
  local.setContextOverride(8192);
  await ask();
  expect(mockInit).toHaveBeenCalledWith(expect.objectContaining({ n_ctx: 8192 }));
  local.setContextOverride(null);
});

test('on iPhone every model runs on the CPU: no Metal', async () => {
  mockOS = 'ios';
  download('qwen2.5-0.5b');
  local.prefs.update({ active: 'qwen2.5-0.5b' });
  await ask();
  expect(mockInit).toHaveBeenCalledWith(expect.objectContaining({ n_gpu_layers: 0 }));
  expect(local.onGpu()).toBe(false);
});

test('a stop that comes while the model loads stops before it runs', async () => {
  download('qwen2.5-0.5b');
  local.prefs.update({ active: 'qwen2.5-0.5b' });
  const controller = new AbortController();
  mockInit.mockImplementationOnce(async (p: { n_gpu_layers: number }) => {
    controller.abort();
    return { gpu: p.n_gpu_layers > 0, release: mockRelease, completion: mockCompletion, stopCompletion: jest.fn() };
  });
  await expect(
    local.generateWithLocalModel({ system: 's', user: 'u' }, { maxTokens: 8, schema: {} }, controller.signal),
  ).rejects.toThrow();
  expect(mockCompletion).not.toHaveBeenCalled();
});

test('a run that fails on the CPU too leaves the model on the GPU', async () => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  download('llama3.2-1b');
  local.prefs.update({ active: 'llama3.2-1b' });
  mockCompletion.mockRejectedValueOnce(new Error('too long')).mockRejectedValueOnce(new Error('too long'));
  await expect(ask()).rejects.toThrow('too long');
  expect(local.prefs.get().cpuOnly).toEqual([]);
  await ask();
  expect(mockInit).toHaveBeenLastCalledWith(expect.objectContaining({ n_gpu_layers: 99 }));
  jest.restoreAllMocks();
});

test('deleting a model clears its CPU-only mark, so a fresh download tries the GPU again', async () => {
  download('qwen3-0.6b');
  local.prefs.markCpuOnly('qwen3-0.6b');
  await local.deleteModel('qwen3-0.6b');
  expect(local.prefs.get().cpuOnly).toEqual([]);
});

test('where it runs is known before loading when it can only be the CPU', async () => {
  download('gemma-270m');
  download('qwen2.5-0.5b');
  local.prefs.update({ active: 'gemma-270m', cpuOnly: [] });
  expect(local.onGpu()).toBe(false);
  local.prefs.update({ active: 'qwen2.5-0.5b' });
  expect(local.onGpu()).toBeNull();
  local.prefs.markCpuOnly('qwen2.5-0.5b');
  expect(local.onGpu()).toBe(false);
});

test('listeners hear when a model loads and when it is freed', async () => {
  const heard = jest.fn();
  const stop = local.onLoadChange(heard);
  download('qwen2.5-0.5b');
  local.prefs.update({ active: 'qwen2.5-0.5b', cpuOnly: [] });
  await ask();
  expect(heard).toHaveBeenCalled();
  heard.mockClear();
  await local.releaseLocalModel();
  expect(heard).toHaveBeenCalled();
  stop();
});

test('where it ran is still known after the model is freed, until it is deleted', async () => {
  download('qwen2.5-0.5b');
  local.prefs.update({ active: 'qwen2.5-0.5b', cpuOnly: [] });
  await ask();
  await local.releaseLocalModel();
  expect(local.onGpu()).toBe(true);
  await local.deleteModel('qwen2.5-0.5b');
  download('qwen2.5-0.5b');
  local.prefs.update({ active: 'qwen2.5-0.5b' });
  expect(local.onGpu()).toBeNull();
});

test('another model in use starts over: nothing is said until it has loaded', async () => {
  download('qwen2.5-0.5b');
  download('llama3.2-1b');
  local.prefs.update({ active: 'qwen2.5-0.5b', cpuOnly: [] });
  await ask();
  local.prefs.update({ active: 'llama3.2-1b' });
  expect(local.onGpu()).toBeNull();
});

test('a failed GPU run is retried on the model it started with, even if another is put in use meanwhile', async () => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  download('qwen3-0.6b');
  download('llama3.2-1b');
  local.prefs.update({ active: 'qwen3-0.6b', cpuOnly: [] });
  mockCompletion.mockImplementationOnce(async () => {
    local.prefs.update({ active: 'llama3.2-1b' });
    throw new Error('GPU driver');
  });
  await ask();
  expect(mockInit).toHaveBeenLastCalledWith(expect.objectContaining({ n_gpu_layers: 0, model: expect.stringContaining('Qwen3-0.6B-Q6_K.gguf') }));
  expect(mockCompletion).toHaveBeenLastCalledWith(expect.objectContaining({ enable_thinking: false }));
  expect(local.prefs.get().cpuOnly).toEqual(['qwen3-0.6b']);
  jest.restoreAllMocks();
});

test('tells the bench when the model starts to write, once', async () => {
  download('gemma-270m');
  local.prefs.update({ active: 'gemma-270m' });
  mockCompletion.mockImplementationOnce((async (_params: object, onToken?: () => void) => {
    onToken?.();
    onToken?.();
    return { text: '{}', timings: { prompt_ms: 1, predicted_ms: 1, predicted_per_second: 1 } };
  }) as never);
  const heard = jest.fn();
  await local.generateWithLocalModel({ system: 's', user: 'u' }, { maxTokens: 8, schema: {} }, signal(), heard);
  expect(heard).toHaveBeenCalledTimes(1);
});

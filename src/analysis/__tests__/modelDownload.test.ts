import { act, renderHook } from '@testing-library/react-native';
import { LocalModelId } from '../../ai/catalog';
import * as local from '../localModel';
import * as store from '../modelDownload';

// The real module downloads hundreds of MB; here each download is driven by hand.
const mockPresent = new Set<string>();
const mockDownloads: {
  id: string;
  progress: (f: number | null) => void;
  resolve: () => void;
  reject: (e: unknown) => void;
  signal?: AbortSignal;
}[] = [];
const mockRelease = jest.fn(async () => {});
let mockPrefsText: string | null = null;
let mockGpu: boolean | null = null;
// What Android's download manager holds for each model's file, as found at launch.
const mockBackground: Record<string, string> = {};
const mockDropped: string[] = [];
jest.mock('../localModel', () => {
  const { createPrefs } = jest.requireActual('../../ai/localModelPrefs');
  const { CATALOG } = jest.requireActual('../../ai/catalog');
  class ModelCheckError extends Error {}
  class NoSpaceError extends Error {}
  const isDownloaded = (id: string) => mockPresent.has(id);
  const loadListeners: (() => void)[] = [];
  const prefs = createPrefs({ read: () => mockPrefsText, write: (t: string) => void (mockPrefsText = t) }, isDownloaded);
  return {
    ModelCheckError,
    NoSpaceError,
    isDownloaded,
    prefs,
    releaseLocalModel: () => mockRelease(),
    backgroundDownloadState: (e: { id: string }) => mockBackground[e.id] ?? 'none',
    dropBackgroundDownload: (e: { id: string }) => void mockDropped.push(e.id),
    onGpu: () => mockGpu,
    // Kept on the mock: the store subscribes when it is imported, before this file's variables exist.
    loadListeners,
    onLoadChange: (l: () => void) => {
      loadListeners.push(l);
      return () => {};
    },
    deleteModel: async (id: string) => {
      const wasActive = prefs.get().active === id;
      mockPresent.delete(id);
      if (wasActive) prefs.update({ active: CATALOG.find((c: { id: string }) => mockPresent.has(c.id))?.id ?? null });
    },
    downloadModel: (e: { id: string }, progress: (f: number | null) => void, signal?: AbortSignal) =>
      new Promise<void>((resolve, reject) => {
        mockDownloads.push({
          id: e.id,
          progress,
          resolve: () => {
            mockPresent.add(e.id);
            resolve();
          },
          reject,
          signal,
        });
        signal?.addEventListener('abort', () => reject(new Error('aborted')));
      }),
  };
});

const all = async () => (await renderHook(() => store.useMenuState())).result;

// The store keeps its state between screens, so also between tests: start each from nothing downloaded.
beforeEach(async () => {
  for (const d of mockDownloads) store.cancelModelDownload(d.id as LocalModelId);
  await Promise.resolve();
  mockDownloads.length = 0;
  mockPresent.clear();
  mockPrefsText = null;
  mockRelease.mockClear();
  store.refresh();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

test('starts from what is on the phone, an existing Gemma being the active model', async () => {
  mockPresent.add('gemma-270m');
  store.refresh();
  const result = await all();
  expect(result.current.models['gemma-270m']).toEqual({ status: 'present' });
  expect(result.current.models['qwen2.5-0.5b']).toEqual({ status: 'absent' });
  expect(result.current.active).toBe('gemma-270m');
  expect(result.current.askWith).toBe('built-in');
});

test('downloads with progress in whole percents, then has the model, which becomes active', async () => {
  const result = await all();
  let done!: Promise<void>;
  await act(() => {
    done = store.startModelDownload('qwen2.5-0.5b');
  });
  expect(result.current.models['qwen2.5-0.5b']).toEqual({ status: 'downloading', progress: 0 });
  await act(() => mockDownloads[0].progress(0.423));
  expect(result.current.models['qwen2.5-0.5b']).toEqual({ status: 'downloading', progress: 0.42 });
  await act(async () => {
    mockDownloads[0].resolve();
    await done;
  });
  expect(result.current.models['qwen2.5-0.5b']).toEqual({ status: 'present' });
  expect(result.current.active).toBe('qwen2.5-0.5b');
});

test('a second model cannot start while one is downloading', async () => {
  void store.startModelDownload('qwen2.5-0.5b');
  await store.startModelDownload('llama3.2-1b');
  void store.startModelDownload('qwen2.5-0.5b');
  expect(mockDownloads).toHaveLength(1);
  expect((await all()).current.downloading).toBe('qwen2.5-0.5b');
});

test('a later download does not take over from the active model', async () => {
  const first = store.startModelDownload('qwen2.5-0.5b');
  mockDownloads[0].resolve();
  await first;
  const second = store.startModelDownload('gemma-270m');
  mockDownloads[1].resolve();
  await second;
  expect((await all()).current.active).toBe('qwen2.5-0.5b');
});

test.each([
  ['network', () => new Error('offline')],
  ['space', () => new local.NoSpaceError('full')],
  ['check', () => new local.ModelCheckError('bad hash')],
] as const)('a failed download says why (%s) on that model only, and can be tried again', async (failure, error) => {
  const result = await all();
  await act(async () => {
    const done = store.startModelDownload('qwen3-0.6b');
    mockDownloads[0].reject(error());
    await done;
  });
  expect(result.current.models['qwen3-0.6b']).toEqual({ status: 'absent', failure });
  expect(result.current.models['llama3.2-1b']).toEqual({ status: 'absent' });
  await act(() => {
    void store.startModelDownload('qwen3-0.6b');
  });
  expect(result.current.models['qwen3-0.6b'].status).toBe('downloading');
});

test('stopping a download leaves no model and no error', async () => {
  const result = await all();
  await act(async () => {
    const done = store.startModelDownload('llama3.2-1b');
    store.cancelModelDownload('llama3.2-1b');
    await done;
  });
  expect(mockDownloads[0].signal?.aborted).toBe(true);
  expect(result.current.models['llama3.2-1b']).toEqual({ status: 'absent' });
  expect(result.current.downloading).toBeNull();
});

test('choosing a model frees the loaded one; the ask-with switch is remembered', async () => {
  mockPresent.add('gemma-270m');
  mockPresent.add('qwen2.5-0.5b');
  store.refresh();
  const result = await all();
  await act(() => store.setActive('qwen2.5-0.5b'));
  expect(mockRelease).toHaveBeenCalled();
  await act(() => store.setAskWith('downloaded'));
  expect(result.current).toMatchObject({ active: 'qwen2.5-0.5b', askWith: 'downloaded' });
});

test('a model that is not downloaded cannot be chosen', async () => {
  await expect(store.setActive('llama3.2-1b')).rejects.toThrow();
});

test('deleting the active model hands over to another downloaded one', async () => {
  mockPresent.add('gemma-270m');
  mockPresent.add('llama3.2-1b');
  mockPrefsText = JSON.stringify({ active: 'llama3.2-1b' });
  store.refresh();
  const result = await all();
  await act(() => store.removeModel('llama3.2-1b'));
  expect(result.current.models['llama3.2-1b']).toEqual({ status: 'absent' });
  expect(result.current.active).toBe('gemma-270m');
});

test('says where the model runs, and updates when it loads', async () => {
  mockPresent.add('qwen2.5-0.5b');
  store.refresh();
  const result = await all();
  expect(result.current.onGpu).toBeNull();
  mockGpu = true;
  await act(() => (local as unknown as { loadListeners: (() => void)[] }).loadListeners.forEach((l) => l()));
  expect(result.current.onGpu).toBe(true);
  mockGpu = null;
});

test('at launch, a download Android carried on with is picked back up and its model put in use', async () => {
  mockBackground['qwen2.5-0.5b'] = 'done';
  const result = await all();
  await act(async () => store.resumeModelDownloads());
  delete mockBackground['qwen2.5-0.5b'];
  expect(result.current.downloading).toBe('qwen2.5-0.5b');
  await act(async () => mockDownloads[0].resolve());
  expect(result.current.models['qwen2.5-0.5b']).toEqual({ status: 'present' });
  expect(result.current.active).toBe('qwen2.5-0.5b');
});

test('at launch, a download that failed while the app was closed is reported, not started again', async () => {
  mockBackground['llama3.2-1b'] = 'failed';
  const result = await all();
  await act(async () => store.resumeModelDownloads());
  delete mockBackground['llama3.2-1b'];
  expect(mockDropped).toContain('llama3.2-1b');
  expect(mockDownloads).toHaveLength(0);
  expect(result.current.models['llama3.2-1b']).toEqual({ status: 'absent', failure: 'network' });
});

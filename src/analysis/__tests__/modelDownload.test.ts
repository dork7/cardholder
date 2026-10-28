import { act, renderHook } from '@testing-library/react-native';
import * as gemma from '../gemma';
import * as store from '../modelDownload';

// The real gemma module downloads ~290 MB; here the download is driven by hand.
let mockExists = false;
let mockDownload: { progress: (f: number | null) => void; resolve: () => void; reject: (e: unknown) => void; signal?: AbortSignal };
const mockDelete = jest.fn(async () => {
  mockExists = false;
});
jest.mock('../gemma', () => {
  class ModelCheckError extends Error {}
  class NoSpaceError extends Error {}
  return {
    ModelCheckError,
    NoSpaceError,
    modelFile: () => ({ exists: mockExists }),
    deleteModel: () => mockDelete(),
    downloadModel: (progress: (f: number | null) => void, signal?: AbortSignal) =>
      new Promise<void>((resolve, reject) => {
        mockDownload = {
          progress,
          resolve: () => {
            mockExists = true;
            resolve();
          },
          reject,
          signal,
        };
        signal?.addEventListener('abort', () => reject(new Error('aborted')));
      }),
  };
});

// The store keeps its state between screens, so also between tests: start each from no model.
beforeEach(async () => {
  store.cancelModelDownload();
  await store.removeModel();
  mockDelete.mockClear();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

test('starts from what is on the phone', async () => {
  mockExists = true;
  expect((await renderHook(() => store.useModelState())).result.current).toEqual({ status: 'present' });
});

test('downloads with progress in whole percents, then has the model', async () => {
  const { result } = await renderHook(() => store.useModelState());
  expect(result.current).toEqual({ status: 'absent' });

  let done!: Promise<void>;
  await act(() => {
    done = store.startModelDownload();
  });
  expect(result.current).toEqual({ status: 'downloading', progress: 0 });
  await act(() => mockDownload.progress(0.423));
  expect(result.current).toEqual({ status: 'downloading', progress: 0.42 });
  await act(async () => {
    mockDownload.resolve();
    await done;
  });
  expect(result.current).toEqual({ status: 'present' });
});

test('a second tap while downloading does not start another download', async () => {
  void store.startModelDownload();
  const first = mockDownload;
  void store.startModelDownload();
  expect(mockDownload).toBe(first);
});

test.each([
  ['network', () => new Error('offline')],
  ['space', () => new gemma.NoSpaceError('full')],
  ['check', () => new gemma.ModelCheckError('bad hash')],
] as const)('a failed download says why (%s), and can be tried again', async (failure, error) => {
  const { result } = await renderHook(() => store.useModelState());
  await act(async () => {
    const done = store.startModelDownload();
    mockDownload.reject(error());
    await done;
  });
  expect(result.current).toEqual({ status: 'absent', failure });
  await act(() => {
    void store.startModelDownload();
  });
  expect(result.current.status).toBe('downloading');
});

test('stopping a download leaves no model and no error', async () => {
  const { result } = await renderHook(() => store.useModelState());
  await act(async () => {
    const done = store.startModelDownload();
    store.cancelModelDownload();
    await done;
  });
  expect(mockDownload.signal?.aborted).toBe(true);
  expect(result.current).toEqual({ status: 'absent' });
});

test('deleting the model', async () => {
  mockExists = true;
  const { result } = await renderHook(() => store.useModelState());
  await act(() => store.removeModel());
  expect(mockDelete).toHaveBeenCalled();
  expect(result.current).toEqual({ status: 'absent' });
});

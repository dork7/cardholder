import { BackgroundDownloader, BackgroundNoSpaceError, BackgroundStatus, downloadInBackground } from '../backgroundDownload';

// A stand-in for Android's download manager: the test says what it reports each time it is asked.
function fake(reports: Partial<BackgroundStatus>[]) {
  const calls: string[] = [];
  let i = 0;
  const native: BackgroundDownloader = {
    start: (url, fileName, title) => void calls.push(`start ${url} ${fileName} ${title}`),
    status: () => ({ state: 'none', bytes: 0, total: -1, reason: 0, ...reports[Math.min(i++, reports.length - 1)] }),
    cancel: (fileName) => void calls.push(`cancel ${fileName}`),
    moveTo: async (fileName, destUri) => void calls.push(`move ${fileName} ${destUri}`),
  };
  return { native, calls };
}

const job = { url: 'https://example.test/m.gguf', fileName: 'm.gguf', title: 'Model', destUri: 'file:///models/m.gguf.part', wait: async () => {} };

test('starts a new download, reports its progress, and moves the whole file into place', async () => {
  const { native, calls } = fake([{}, { state: 'running', bytes: 0 }, { state: 'running', bytes: 50, total: 200 }, { state: 'done' }]);
  const progress: (number | null)[] = [];
  const beforeStart = jest.fn();
  await downloadInBackground(native, { ...job, beforeStart, onProgress: (f) => progress.push(f) });
  expect(beforeStart).toHaveBeenCalledTimes(1);
  expect(progress).toEqual([null, 0.25]);
  expect(calls).toEqual(['start https://example.test/m.gguf m.gguf Model', 'move m.gguf file:///models/m.gguf.part']);
});

test('picks up a download that carried on while the app was closed, without starting another', async () => {
  const { native, calls } = fake([{ state: 'running', bytes: 150, total: 200 }, { state: 'running', bytes: 150, total: 200 }, { state: 'done' }]);
  const beforeStart = jest.fn();
  await downloadInBackground(native, { ...job, beforeStart });
  expect(beforeStart).not.toHaveBeenCalled();
  expect(calls).toEqual(['move m.gguf file:///models/m.gguf.part']);
});

test('one that finished while the app was closed is only moved into place', async () => {
  const { native, calls } = fake([{ state: 'done' }]);
  await downloadInBackground(native, job);
  expect(calls).toEqual(['move m.gguf file:///models/m.gguf.part']);
});

test('a failed download is started again when asked for again', async () => {
  const { native, calls } = fake([{ state: 'failed', reason: 1004 }, { state: 'done' }]);
  await downloadInBackground(native, job);
  expect(calls[0]).toMatch(/^start /);
});

test('stopping removes the download', async () => {
  const { native, calls } = fake([{ state: 'running' }]);
  const abort = new AbortController();
  const run = downloadInBackground(native, { ...job, signal: abort.signal, wait: async () => abort.abort() });
  await expect(run).rejects.toThrow('stopped');
  expect(calls).toEqual(['cancel m.gguf']);
});

test('a failure is thrown and cleared away; no space is told apart', async () => {
  const failed = fake([{}, { state: 'failed', reason: 1004 }]);
  await expect(downloadInBackground(failed.native, job)).rejects.toThrow('1004');
  expect(failed.calls).toContain('cancel m.gguf');
  const full = fake([{}, { state: 'failed', reason: 1006 }]);
  await expect(downloadInBackground(full.native, job)).rejects.toBeInstanceOf(BackgroundNoSpaceError);
});

test('a download removed from outside the app ends as a failure, and nothing is moved', async () => {
  const { native, calls } = fake([{ state: 'running' }, { state: 'none' }]);
  await expect(downloadInBackground(native, job)).rejects.toThrow('removed');
  expect(calls).toEqual([]);
});

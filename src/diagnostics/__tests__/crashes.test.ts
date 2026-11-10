import {
  collectCrash,
  CRASH_FILE,
  CrashNative,
  dismissCrash,
  getPendingCrash,
  installCrashHandlers,
  markPrompted,
  NATIVE_CRASH_FILE,
  PENDING_FILE,
  readPending,
  setPendingCrash,
} from '../crashes';
import { createMemoryDiagnosticsFiles } from '../files';
import { createLogger } from '../log';

const NOW = 1_700_000_000_000;
const noExits: CrashNative = { lastExits: null };

function fakeErrorUtils() {
  let handler = jest.fn();
  return {
    previous: handler,
    getGlobalHandler: () => handler,
    setGlobalHandler: (next: typeof handler) => {
      handler = next;
    },
    fire: (error: unknown, fatal: boolean) => handler(error, fatal),
  };
}

describe('the JavaScript error handler', () => {
  test('a fatal error is written before the previous handler runs; a non-fatal one is only logged', async () => {
    const files = createMemoryDiagnosticsFiles();
    const logger = createLogger(files);
    const utils = fakeErrorUtils();
    const previous = utils.previous;
    installCrashHandlers({ files, logger, errorUtils: utils, now: () => NOW });

    utils.fire(new Error('minor'), false);
    expect(previous).toHaveBeenCalledWith(expect.any(Error), false);
    expect(files.read(CRASH_FILE)).toBeNull();

    utils.fire(new TypeError('Cannot read x'), true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(previous).toHaveBeenLastCalledWith(expect.any(TypeError), true);
    const record = JSON.parse(files.read(CRASH_FILE) ?? '');
    expect(record).toMatchObject({ at: NOW, kind: 'js', message: 'TypeError: Cannot read x' });
    expect(logger.recent().at(-1)?.message).toContain('Fatal error TypeError: Cannot read x');
  });

  test('unhandled promise rejections are logged and passed to React Native', () => {
    const files = createMemoryDiagnosticsFiles();
    const logger = createLogger(files);
    const defaultHandler = jest.fn();
    let tracker: Parameters<NonNullable<NonNullable<Parameters<typeof installCrashHandlers>[0]['hermes']>['enablePromiseRejectionTracker']>>[0] | null = null;
    installCrashHandlers({
      files,
      logger,
      errorUtils: fakeErrorUtils(),
      hermes: { enablePromiseRejectionTracker: (options) => (tracker = options) },
      defaultRejectionHandler: defaultHandler,
    });
    tracker!.onUnhandled(3, new Error('nobody caught me'));
    expect(logger.recent()[0].message).toContain('Unhandled promise rejection Error: nobody caught me');
    expect(defaultHandler).toHaveBeenCalledWith(3, expect.any(Error));
  });
});

describe('finding the last crash on launch', () => {
  test('nothing recorded, nothing pending', async () => {
    const files = createMemoryDiagnosticsFiles();
    expect(await collectCrash(files, noExits, { wasRunning: false, useMarker: true })).toBeNull();
  });

  test('a JavaScript record becomes the pending crash and the file is cleared', async () => {
    const files = createMemoryDiagnosticsFiles();
    await files.write(CRASH_FILE, JSON.stringify({ at: NOW, kind: 'js', message: 'TypeError: x', detail: 'at a.js:1' }));
    const pending = await collectCrash(files, noExits, { wasRunning: true, useMarker: true });
    expect(pending).toEqual({ record: { at: NOW, kind: 'js', message: 'TypeError: x', detail: 'at a.js:1' }, prompted: false });
    expect(files.read(CRASH_FILE)).toBeNull();
    expect(readPending(files)).toEqual(pending);
  });

  test('a native record is parsed; the JavaScript one wins when both describe the same crash', async () => {
    const files = createMemoryDiagnosticsFiles();
    await files.write(NATIVE_CRASH_FILE, `${NOW + 50}\njava.lang.RuntimeException: boom (thread main)\n  at x.y\n`);
    let pending = await collectCrash(files, noExits, { wasRunning: false, useMarker: false });
    expect(pending?.record).toEqual({ at: NOW + 50, kind: 'native', message: 'java.lang.RuntimeException: boom (thread main)', detail: 'at x.y' });
    expect(files.read(NATIVE_CRASH_FILE)).toBeNull();

    await files.write(CRASH_FILE, JSON.stringify({ at: NOW + 60_000 * 2, kind: 'js', message: 'TypeError: x', detail: '' }));
    await files.write(NATIVE_CRASH_FILE, `${NOW + 60_000 * 2 + 10}\ncom.facebook.react.common.JavascriptException: TypeError: x\n`);
    pending = await collectCrash(files, noExits, { wasRunning: false, useMarker: false });
    expect(pending?.record.kind).toBe('js');
  });

  test("Android's exit reasons: crashes and ANRs count, each once, nothing else does", async () => {
    const files = createMemoryDiagnosticsFiles();
    const exits = jest.fn((since: number) =>
      [
        { at: NOW - 5000, reason: 'other' as const, description: 'user request', trace: '' },
        { at: NOW - 1000, reason: 'anr' as const, description: 'Input dispatching timed out', trace: 'main thread stack' },
      ].filter((e) => e.at > since),
    );
    const native: CrashNative = { lastExits: exits };
    const pending = await collectCrash(files, native, { wasRunning: true, useMarker: true });
    expect(pending?.record).toEqual({ at: NOW - 1000, kind: 'anr', message: 'Input dispatching timed out', detail: 'main thread stack' });
    // Dismissed, then launched again: the same exit isn't found twice.
    files.remove(PENDING_FILE);
    expect(await collectCrash(files, native, { wasRunning: true, useMarker: true })).toBeNull();
    expect(exits).toHaveBeenLastCalledWith(NOW - 1000);
  });

  test('the running marker counts only where the system has no exit reasons', async () => {
    const files = createMemoryDiagnosticsFiles();
    const pending = await collectCrash(files, noExits, { wasRunning: true, useMarker: true, now: () => NOW });
    expect(pending?.record).toMatchObject({ kind: 'unexpected-exit', at: NOW });
    files.remove(PENDING_FILE);
    expect(await collectCrash(files, { lastExits: () => [] }, { wasRunning: true, useMarker: true })).toBeNull();
    expect(await collectCrash(files, noExits, { wasRunning: true, useMarker: false })).toBeNull();
  });

  test('a crash still waiting to be sent survives a launch that finds nothing new', async () => {
    const files = createMemoryDiagnosticsFiles();
    await files.write(PENDING_FILE, JSON.stringify({ record: { at: NOW, kind: 'js', message: 'old', detail: '' }, prompted: true }));
    const pending = await collectCrash(files, noExits, { wasRunning: false, useMarker: true });
    expect(pending).toMatchObject({ record: { message: 'old' }, prompted: true });
  });

  test('a corrupt file is thrown away rather than crashing the check', async () => {
    const files = createMemoryDiagnosticsFiles();
    await files.write(CRASH_FILE, '{"at": 12');
    await files.write(PENDING_FILE, 'not json');
    expect(await collectCrash(files, noExits, { wasRunning: false, useMarker: true })).toBeNull();
  });
});

describe('the pending crash the screens see', () => {
  test('prompted is remembered; dismissing removes it', async () => {
    const files = createMemoryDiagnosticsFiles();
    const pending = { record: { at: NOW, kind: 'js' as const, message: 'x', detail: '' }, prompted: false };
    await files.write(PENDING_FILE, JSON.stringify(pending));
    setPendingCrash(files, pending);
    await markPrompted();
    expect(getPendingCrash()?.prompted).toBe(true);
    expect(readPending(files)?.prompted).toBe(true);
    dismissCrash();
    expect(getPendingCrash()).toBeNull();
    expect(files.read(PENDING_FILE)).toBeNull();
  });
});

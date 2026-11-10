import { LOG_KEEP_LINES } from '../../config';
import { createMemoryDiagnosticsFiles } from '../files';
import { captureConsole, createLogger, describeError, formatLine, LOG_FILE, LOG_FILE_PREVIOUS, readLogFiles } from '../log';

let mockMaxBytes = 1_000_000;
jest.mock('../../config', () =>
  Object.defineProperty({ ...jest.requireActual('../../config'), LOG_KEEP_LINES: 5 }, 'LOG_FILE_MAX_BYTES', { get: () => mockMaxBytes }),
);

beforeEach(() => {
  mockMaxBytes = 1_000_000;
});

test('an error is its name, message and trimmed stack; a cause follows', () => {
  const inner = new Error('disk full');
  const outer = new Error('Saving failed', { cause: inner });
  const text = describeError(outer);
  expect(text.startsWith('Error: Saving failed\n')).toBe(true);
  expect(text).toContain('Caused by: Error: disk full');
  expect(text.split('\n').filter((l) => l.startsWith('at ')).length).toBeLessThanOrEqual(12 + 4);
  expect(describeError('just text')).toBe('just text');
  expect(describeError({ code: 7 })).toBe('{"code":7}');
});

test('keeps the last lines in memory and all of them on disk, oldest first', async () => {
  const files = createMemoryDiagnosticsFiles();
  let t = 1_700_000_000_000;
  const logger = createLogger(files, () => (t += 1000));
  for (let i = 1; i <= LOG_KEEP_LINES + 2; i++) logger.info(`line ${i}`);
  await logger.flush();
  expect(logger.recent().map((l) => l.message)).toEqual(['line 3', 'line 4', 'line 5', 'line 6', 'line 7']);
  const onDisk = files.read(LOG_FILE) ?? '';
  expect(onDisk.split('\n').filter(Boolean)).toHaveLength(7);
  expect(onDisk).toContain(formatLine({ at: 1_700_000_001_000, level: 'info', message: 'line 1' }));
  expect(onDisk).toMatch(/INFO  line 1/);
});

test('once the file is full it becomes the older one, and a report reads both in order', async () => {
  const files = createMemoryDiagnosticsFiles();
  const logger = createLogger(files, () => 1_700_000_000_000);
  // Each line is about 70 bytes: the first rotation comes after the fourth line.
  mockMaxBytes = 250;
  for (let i = 0; i < 6; i++) logger.warn(`a fairly long line so the file fills up quickly ${i}`);
  await logger.flush();
  const previous = files.read(LOG_FILE_PREVIOUS) ?? '';
  const current = files.read(LOG_FILE) ?? '';
  expect(previous).toContain('quickly 0');
  expect(previous).toContain('quickly 3');
  expect(current).not.toContain('quickly 3');
  expect(current).toContain('quickly 5');
  const both = readLogFiles(files);
  expect(both.indexOf('quickly 0')).toBeLessThan(both.indexOf('quickly 5'));
});

test('a failed write never throws into the caller', async () => {
  const files = createMemoryDiagnosticsFiles();
  files.append = async () => {
    throw new Error('read-only');
  };
  const logger = createLogger(files);
  expect(() => logger.error('boom')).not.toThrow();
  await expect(logger.flush()).resolves.toBeUndefined();
});

test('console.warn and console.error are copied into the log and still printed', () => {
  const files = createMemoryDiagnosticsFiles();
  const logger = createLogger(files);
  const warn = jest.fn();
  const target = { warn, error: jest.fn() };
  const undo = captureConsole(logger, target);
  target.warn('Boot failed', new Error('SQLITE_IOERR'));
  target.error('Widget sync failed');
  expect(logger.recent().map((l) => [l.level, l.message.split('\n')[0]])).toEqual([
    ['warn', 'Boot failed Error: SQLITE_IOERR'],
    ['error', 'Widget sync failed'],
  ]);
  expect(warn).toHaveBeenCalledTimes(1);
  undo();
  expect(target.warn).toBe(warn);
  target.warn('after');
  expect(logger.recent()).toHaveLength(2);
});

import { LOG_FILE_MAX_BYTES, LOG_KEEP_LINES } from '../config';
import { DiagnosticsFiles } from './files';

// The app's own log: what went wrong and when, kept on the phone so a crash report can carry the
// minutes before it. It must never hold a document's text, name or picture: callers log what the app
// was doing ("Reading a document failed"), not what the document says.

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogLine {
  at: number;
  level: LogLevel;
  message: string;
}

export const LOG_FILE = 'app.log';
export const LOG_FILE_PREVIOUS = 'app.1.log';

// An error as one block: its name and message, then the stack trimmed to what identifies the place.
export function describeError(error: unknown, frames = 12): string {
  if (error instanceof Error) {
    const head = `${error.name}: ${error.message}`;
    const stack = (error.stack ?? '')
      .split('\n')
      .filter((line) => /^\s+at\s|@/.test(line))
      .slice(0, frames)
      .map((line) => line.trim())
      .join('\n');
    const cause = error.cause === undefined ? '' : `\nCaused by: ${describeError(error.cause, 4)}`;
    return stack ? `${head}\n${stack}${cause}` : head + cause;
  }
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error) ?? String(error);
  } catch {
    return String(error);
  }
}

export const formatLine = ({ at, level, message }: LogLine): string =>
  `${new Date(at).toISOString()} ${level.toUpperCase().padEnd(5)} ${message}`;

export interface Logger {
  info(message: string, ...details: unknown[]): void;
  warn(message: string, ...details: unknown[]): void;
  error(message: string, ...details: unknown[]): void;
  // The last lines, oldest first, for a report.
  recent(): LogLine[];
  // Resolves once every line logged so far is on disk; a crash handler waits for this.
  flush(): Promise<void>;
}

export function createLogger(files: DiagnosticsFiles, now: () => number = Date.now): Logger {
  const ring: LogLine[] = [];
  let writing: Promise<void> = Promise.resolve();

  const persist = (line: string) => {
    writing = writing
      .then(async () => {
        if (files.size(LOG_FILE) > LOG_FILE_MAX_BYTES) {
          // Keep one older log so the lines before a restart survive. Both are read into a report.
          const previous = files.read(LOG_FILE);
          if (previous !== null) await files.write(LOG_FILE_PREVIOUS, previous);
          files.remove(LOG_FILE);
        }
        await files.append(LOG_FILE, line + '\n');
      })
      // A failed write must never take the app down with it; the next line tries again.
      .catch(() => {});
  };

  const add = (level: LogLevel, message: string, details: unknown[]) => {
    const text = [message, ...details.map((d) => describeError(d))].join(' ');
    const line = { at: now(), level, message: text };
    ring.push(line);
    if (ring.length > LOG_KEEP_LINES) ring.splice(0, ring.length - LOG_KEEP_LINES);
    persist(formatLine(line));
  };

  return {
    info: (message, ...details) => add('info', message, details),
    warn: (message, ...details) => add('warn', message, details),
    error: (message, ...details) => add('error', message, details),
    recent: () => [...ring],
    flush: () => writing,
  };
}

// The log file(s) as text, oldest first: what a report attaches when the app has been restarted since.
export function readLogFiles(files: DiagnosticsFiles): string {
  return [files.read(LOG_FILE_PREVIOUS), files.read(LOG_FILE)].filter((t): t is string => t !== null).join('');
}

// Every console.warn and console.error in the app already names what failed; this copies them into
// the log without touching the call sites. The console still prints them for development.
export function captureConsole(logger: Logger, target: Pick<Console, 'warn' | 'error'> = console): () => void {
  const warn = target.warn;
  const error = target.error;
  target.warn = (...args: unknown[]) => {
    logger.warn(String(args[0] ?? ''), ...args.slice(1));
    warn.apply(target, args);
  };
  target.error = (...args: unknown[]) => {
    logger.error(String(args[0] ?? ''), ...args.slice(1));
    error.apply(target, args);
  };
  return () => {
    target.warn = warn;
    target.error = error;
  };
}

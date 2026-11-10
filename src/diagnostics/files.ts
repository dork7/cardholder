import { Directory, File, Paths } from 'expo-file-system';

// The handful of small text files diagnostics keeps (the log, the last crash, the foreground marker).
// A port, so the logger and crash store are tested against memory and never touch the disk.
export interface DiagnosticsFiles {
  read(name: string): string | null;
  write(name: string, text: string): Promise<void>;
  append(name: string, text: string): Promise<void>;
  remove(name: string): void;
  size(name: string): number;
  // Where the files live, so a report can be shared from there.
  uri: string;
}

// Lives in the app's documents directory, next to the cards (nothing in it is a card). The native
// crash handlers (modules/crash-log) write into the same folder, so it must stay `diagnostics/`.
export const DIAGNOSTICS_FOLDER = 'diagnostics';

export function createDiagnosticsFiles(folder = DIAGNOSTICS_FOLDER): DiagnosticsFiles {
  const dir = new Directory(Paths.document, folder);
  const ensureDir = () => {
    if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  };
  const file = (name: string) => new File(dir, name);
  return {
    read(name) {
      const f = file(name);
      return f.exists ? f.textSync() : null;
    },
    async write(name, text) {
      ensureDir();
      const f = file(name);
      f.create({ overwrite: true, intermediates: true });
      await f.write(text);
    },
    async append(name, text) {
      ensureDir();
      const f = file(name);
      if (!f.exists) {
        f.create({ intermediates: true });
        await f.write(text);
        return;
      }
      // expo-file-system has no append: a short file is rewritten whole. The log is rotated well
      // before that costs anything (see log.ts).
      await f.write(f.textSync() + text);
    },
    remove(name) {
      const f = file(name);
      if (f.exists) f.delete();
    },
    size(name) {
      const f = file(name);
      return f.exists ? f.size : 0;
    },
    get uri() {
      return dir.uri;
    },
  };
}

export function createMemoryDiagnosticsFiles(): DiagnosticsFiles & { files: Map<string, string> } {
  const files = new Map<string, string>();
  return {
    files,
    read: (name) => files.get(name) ?? null,
    async write(name, text) {
      files.set(name, text);
    },
    async append(name, text) {
      files.set(name, (files.get(name) ?? '') + text);
    },
    remove(name) {
      files.delete(name);
    },
    size: (name) => files.get(name)?.length ?? 0,
    uri: 'memory://diagnostics',
  };
}

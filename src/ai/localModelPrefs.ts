import { entry, LocalModelId } from './catalog';

// Which downloaded model is in use, which ones failed on this phone's GPU, and what asking uses.
// Kept in models/prefs.json beside the model files (see src/analysis/localModel.ts), because the model
// code has no access to the settings database. Never anything about documents.

export type AskWith = 'built-in' | 'downloaded';

export interface LocalModelPrefs {
  active: LocalModelId | null;
  cpuOnly: LocalModelId[];
  askWith: AskWith;
}

export interface PrefsStore {
  read(): string | null;
  write(text: string): void;
}

const isId = (v: unknown): v is LocalModelId => typeof v === 'string' && entry(v) !== null;

// A corrupt file, or one naming a model the app no longer offers, falls back to the defaults.
function parse(text: string | null): Partial<LocalModelPrefs> {
  if (!text) return {};
  try {
    const raw = JSON.parse(text) as Record<string, unknown>;
    if (!raw || typeof raw !== 'object') return {};
    return {
      active: isId(raw.active) ? raw.active : null,
      cpuOnly: Array.isArray(raw.cpuOnly) ? raw.cpuOnly.filter(isId) : [],
      askWith: raw.askWith === 'downloaded' ? 'downloaded' : 'built-in',
    };
  } catch {
    return {};
  }
}

export function createPrefs(store: PrefsStore, isDownloaded: (id: LocalModelId) => boolean) {
  const get = (): LocalModelPrefs => {
    const saved = parse(store.read());
    // Before the menu there was only Gemma and no prefs file: a Gemma file on the phone is the active model.
    let active = saved.active === undefined && isDownloaded('gemma-270m') ? 'gemma-270m' : (saved.active ?? null);
    if (active && !isDownloaded(active)) active = null;
    return { active, cpuOnly: saved.cpuOnly ?? [], askWith: saved.askWith ?? 'built-in' };
  };
  const update = (patch: Partial<LocalModelPrefs>): LocalModelPrefs => {
    const next = { ...get(), ...patch };
    store.write(JSON.stringify(next));
    return next;
  };
  return {
    get,
    update,
    markCpuOnly(id: LocalModelId) {
      const { cpuOnly } = get();
      if (!cpuOnly.includes(id)) update({ cpuOnly: [...cpuOnly, id] });
    },
  };
}

export type Prefs = ReturnType<typeof createPrefs>;

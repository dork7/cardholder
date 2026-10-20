import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Card } from '../cards/types';
import { secureVault } from '../crypto/secureVault';
import { isUnlocked } from '../purchases/entitlement';
import { syncReminders } from '../reminders/scheduler';
import { createFileBlobStore } from '../storage/fileBlobStore';
import { openDatabase } from '../storage/openDatabase';
import { boot, BootDeps, bootFresh, Services } from './boot';

export type BootPhase =
  | { status: 'loading' }
  | { status: 'orphaned' }
  | { status: 'error'; message: string }
  | { status: 'ready'; services: Services };

interface BootContextValue {
  phase: BootPhase;
  startFresh(thenImport: boolean): Promise<void>;
}

export interface AppContextValue {
  services: Services;
  cards: Card[];
  unlocked: boolean;
  refresh(): Promise<void>;
  openImportOnReady: boolean;
  clearOpenImport(): void;
}

const BootContext = createContext<BootContextValue | null>(null);
const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<BootPhase>({ status: 'loading' });
  const [deps, setDeps] = useState<BootDeps | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [unlocked, setUnlocked] = useState(false);
  const [openImportOnReady, setOpenImportOnReady] = useState(false);

  const load = useCallback(async (services: Services) => {
    const [list, unlockedNow] = await Promise.all([services.store.list(), isUnlocked(services.settings)]);
    setCards(list);
    setUnlocked(unlockedNow);
    syncReminders(list).catch((e) => console.warn('Reminder sync failed', e));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const bootDeps: BootDeps = { db: await openDatabase(), blobs: createFileBlobStore(), vault: secureVault };
        setDeps(bootDeps);
        const result = await boot(bootDeps);
        if (result.status === 'orphaned') {
          setPhase({ status: 'orphaned' });
          return;
        }
        await load(result.services);
        setPhase({ status: 'ready', services: result.services });
      } catch (e) {
        setPhase({ status: 'error', message: e instanceof Error ? e.message : String(e) });
      }
    })();
  }, [load]);

  const startFresh = useCallback(
    async (thenImport: boolean) => {
      if (!deps) return;
      const services = await bootFresh(deps);
      await load(services);
      setOpenImportOnReady(thenImport);
      setPhase({ status: 'ready', services });
    },
    [deps, load],
  );

  const bootValue = useMemo(() => ({ phase, startFresh }), [phase, startFresh]);

  const appValue = useMemo<AppContextValue | null>(() => {
    if (phase.status !== 'ready') return null;
    const { services } = phase;
    return {
      services,
      cards,
      unlocked,
      refresh: () => load(services),
      openImportOnReady,
      clearOpenImport: () => setOpenImportOnReady(false),
    };
  }, [phase, cards, unlocked, load, openImportOnReady]);

  return (
    <BootContext.Provider value={bootValue}>
      <AppContext.Provider value={appValue}>{children}</AppContext.Provider>
    </BootContext.Provider>
  );
}

export function useBoot(): BootContextValue {
  const value = useContext(BootContext);
  if (!value) throw new Error('useBoot must be used inside AppProvider');
  return value;
}

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp used before the app finished booting');
  return value;
}

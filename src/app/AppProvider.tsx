import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '../cards/types';
import { secureVault } from '../crypto/secureVault';
import { isUnlocked } from '../purchases/entitlement';
import { syncReminders } from '../reminders/scheduler';
import { AppearancePref, applyAppearance, loadAppearance, saveAppearance } from '../ui/appearance';
import { createFileBlobStore } from '../storage/fileBlobStore';
import { openDatabase } from '../storage/openDatabase';
import { boot, BootDeps, bootFresh, Services } from './boot';
import { AppSnapshot, createRefreshCoordinator } from './refreshCoordinator';

export type BootPhase =
  | { status: 'loading' }
  | { status: 'orphaned' }
  | { status: 'error' }
  | { status: 'ready'; services: Services };

interface BootContextValue {
  phase: BootPhase;
  startFresh(thenImport: boolean): Promise<void>;
  // Re-runs boot after a failed start; does nothing in any other phase.
  retry(): Promise<void>;
}

export interface AppContextValue {
  services: Services;
  cards: Card[];
  unlocked: boolean;
  refresh(): Promise<void>;
  openImportOnReady: boolean;
  clearOpenImport(): void;
  appearance: AppearancePref;
  setAppearance(pref: AppearancePref): Promise<void>;
}

const BootContext = createContext<BootContextValue | null>(null);
const AppContext = createContext<AppContextValue | null>(null);

async function readSnapshot(services: Services): Promise<AppSnapshot> {
  const [cards, unlocked] = await Promise.all([services.store.list(), isUnlocked(services.settings)]);
  return { cards, unlocked };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<BootPhase>({ status: 'loading' });
  const [cards, setCards] = useState<Card[]>([]);
  const [unlocked, setUnlocked] = useState(false);
  const [openImportOnReady, setOpenImportOnReady] = useState(false);
  const [appearance, setAppearanceState] = useState<AppearancePref>('system');
  const depsRef = useRef<BootDeps | null>(null);
  const bootingRef = useRef(false);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  // One coordinator for the provider's lifetime: it makes the newest load win and keeps reminder
  // syncs from overlapping (see refreshCoordinator.ts).
  const [coordinator] = useState(() =>
    createRefreshCoordinator({
      apply: (snapshot) => {
        setCards(snapshot.cards);
        setUnlocked(snapshot.unlocked);
      },
      syncReminders,
      onSyncError: (e) => console.warn('Reminder sync failed', e),
    }),
  );

  // The saved choice is applied before the first screen draws; reading it never blocks boot.
  const restoreAppearance = useCallback(async (services: Services) => {
    const pref = await loadAppearance(services.settings).catch(() => 'system' as const);
    applyAppearance(pref);
    setAppearanceState(pref);
  }, []);

  const runBoot = useCallback(async () => {
    if (bootingRef.current) return;
    bootingRef.current = true;
    setPhase({ status: 'loading' });
    try {
      // Opened once; a retry after a later boot step failed reuses the same handles.
      depsRef.current ??= { db: await openDatabase(), blobs: createFileBlobStore(), vault: secureVault };
      const result = await boot(depsRef.current);
      if (result.status === 'orphaned') {
        setPhase({ status: 'orphaned' });
        return;
      }
      await coordinator.load(() => readSnapshot(result.services));
      await restoreAppearance(result.services);
      setPhase({ status: 'ready', services: result.services });
    } catch (e) {
      // The raw error can carry native paths and codes: log it, show only localized copy.
      console.warn('Boot failed', e);
      setPhase({ status: 'error' });
    } finally {
      bootingRef.current = false;
    }
  }, [coordinator, restoreAppearance]);

  useEffect(() => {
    void runBoot();
  }, [runBoot]);

  const retry = useCallback(async () => {
    if (phaseRef.current.status === 'error') await runBoot();
  }, [runBoot]);

  const startFresh = useCallback(
    async (thenImport: boolean) => {
      const deps = depsRef.current;
      if (!deps) return;
      const services = await bootFresh(deps);
      await coordinator.load(() => readSnapshot(services));
      await restoreAppearance(services);
      setOpenImportOnReady(thenImport);
      setPhase({ status: 'ready', services });
    },
    [coordinator, restoreAppearance],
  );

  const services = phase.status === 'ready' ? phase.services : null;
  const refresh = useCallback(async () => {
    if (services) await coordinator.load(() => readSnapshot(services));
  }, [coordinator, services]);
  const clearOpenImport = useCallback(() => setOpenImportOnReady(false), []);
  const setAppearance = useCallback(
    async (pref: AppearancePref) => {
      // Applied first so the switch is instant; a failed save only means it isn't remembered.
      applyAppearance(pref);
      setAppearanceState(pref);
      if (services) await saveAppearance(services.settings, pref);
    },
    [services],
  );

  const bootValue = useMemo(() => ({ phase, startFresh, retry }), [phase, startFresh, retry]);

  const appValue = useMemo<AppContextValue | null>(
    () =>
      services
        ? { services, cards, unlocked, refresh, openImportOnReady, clearOpenImport, appearance, setAppearance }
        : null,
    [services, cards, unlocked, refresh, openImportOnReady, clearOpenImport, appearance, setAppearance],
  );

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

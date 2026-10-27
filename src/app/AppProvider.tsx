import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { categoryOptions } from '../cards/categories';
import { Card, CardCategory, Folder } from '../cards/types';
import { secureVault } from '../crypto/secureVault';
import { DEFAULT_HOME_FOLDERS, HomeFolderOptions, loadHomeFolders, saveHomeFolders } from '../folders/homeOptions';
import { isUnlocked } from '../purchases/entitlement';
import { syncReminders } from '../reminders/scheduler';
import { loadAppLock, saveAppLock } from '../security/appLock';
import { syncShortcuts } from '../shortcuts/quickActions';
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
  folders: Folder[];
  // Every category a card can be put in: the saved list plus any a card already holds.
  categories: CardCategory[];
  unlocked: boolean;
  refresh(): Promise<void>;
  openImportOnReady: boolean;
  clearOpenImport(): void;
  appearance: AppearancePref;
  setAppearance(pref: AppearancePref): Promise<void>;
  appLock: boolean;
  // Saves the choice only; the caller confirms with the device lock first.
  setAppLock(on: boolean): Promise<void>;
  homeFolders: HomeFolderOptions;
  setHomeFolders(options: HomeFolderOptions): Promise<void>;
}

const BootContext = createContext<BootContextValue | null>(null);
const AppContext = createContext<AppContextValue | null>(null);

async function readSnapshot(services: Services): Promise<AppSnapshot> {
  const [cards, folders, categories, unlocked] = await Promise.all([
    services.store.list(),
    services.store.listFolders(),
    services.store.listCategories(),
    isUnlocked(services.settings),
  ]);
  return { cards, folders, categories, unlocked };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<BootPhase>({ status: 'loading' });
  const [cards, setCards] = useState<Card[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [savedCategories, setSavedCategories] = useState<CardCategory[]>([]);
  const [unlocked, setUnlocked] = useState(false);
  const [openImportOnReady, setOpenImportOnReady] = useState(false);
  const [appearance, setAppearanceState] = useState<AppearancePref>('system');
  const [appLock, setAppLockState] = useState(false);
  const [homeFolders, setHomeFoldersState] = useState<HomeFolderOptions>(DEFAULT_HOME_FOLDERS);
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
        setFolders(snapshot.folders);
        setSavedCategories(snapshot.categories);
        setUnlocked(snapshot.unlocked);
      },
      // Shortcuts follow the cards too; a failure there must not stop reminders being scheduled.
      syncReminders: async (cards) => {
        await syncShortcuts(cards).catch((e) => console.warn('Shortcut sync failed', e));
        await syncReminders(cards);
      },
      onSyncError: (e) => console.warn('Reminder sync failed', e),
    }),
  );

  // Saved preferences are applied before the first screen draws; reading them never blocks boot.
  const restorePreferences = useCallback(async (services: Services) => {
    const pref = await loadAppearance(services.settings).catch(() => 'system' as const);
    applyAppearance(pref);
    setAppearanceState(pref);
    // Read before the first screen draws, so a locked app never shows a card first. A failed read
    // means locked: the lock only ever errs towards asking.
    setAppLockState(await loadAppLock(services.settings).catch(() => true));
    setHomeFoldersState(await loadHomeFolders(services.settings).catch(() => DEFAULT_HOME_FOLDERS));
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
      await restorePreferences(result.services);
      setPhase({ status: 'ready', services: result.services });
    } catch (e) {
      // The raw error can carry native paths and codes: log it, show only localized copy.
      console.warn('Boot failed', e);
      setPhase({ status: 'error' });
    } finally {
      bootingRef.current = false;
    }
  }, [coordinator, restorePreferences]);

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
      await restorePreferences(services);
      setOpenImportOnReady(thenImport);
      setPhase({ status: 'ready', services });
    },
    [coordinator, restorePreferences],
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

  const setAppLock = useCallback(
    async (on: boolean) => {
      if (services) await saveAppLock(services.settings, on);
      setAppLockState(on);
    },
    [services],
  );

  const setHomeFolders = useCallback(
    async (options: HomeFolderOptions) => {
      // Shown at once; a failed save only means it isn't remembered.
      setHomeFoldersState(options);
      if (services) await saveHomeFolders(services.settings, options);
    },
    [services],
  );

  const categories = useMemo(() => categoryOptions(savedCategories, cards), [savedCategories, cards]);

  const bootValue = useMemo(() => ({ phase, startFresh, retry }), [phase, startFresh, retry]);

  const appValue = useMemo<AppContextValue | null>(
    () =>
      services
        ? {
            services,
            cards,
            folders,
            categories,
            unlocked,
            refresh,
            openImportOnReady,
            clearOpenImport,
            appearance,
            setAppearance,
            appLock,
            setAppLock,
            homeFolders,
            setHomeFolders,
          }
        : null,
    [
      services,
      cards,
      folders,
      categories,
      unlocked,
      refresh,
      openImportOnReady,
      clearOpenImport,
      appearance,
      setAppearance,
      appLock,
      setAppLock,
      homeFolders,
      setHomeFolders,
    ],
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

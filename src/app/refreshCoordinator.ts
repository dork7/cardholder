import { Card, Folder } from '../cards/types';

export interface AppSnapshot {
  cards: Card[];
  folders: Folder[];
  unlocked: boolean;
}

export interface RefreshCoordinatorOptions {
  apply(snapshot: AppSnapshot): void;
  syncReminders(cards: Card[]): Promise<void>;
  onSyncError?(error: unknown): void;
}

export interface RefreshCoordinator {
  // Reads a snapshot and applies it only if no newer load has started since. Resolves true when applied.
  load(read: () => Promise<AppSnapshot>): Promise<boolean>;
  // Resolves when no reminder sync is running or queued.
  idle(): Promise<void>;
}

// Overlapping refreshes are normal (every mutation calls refresh). Two rules keep the result right:
// 1. Latest wins: only the newest load may apply state or request a reminder sync.
// 2. Reminder syncs cancel-then-schedule, so they must never overlap; requests that arrive while one
//    runs are coalesced into a single follow-up sync that uses the newest cards.
export function createRefreshCoordinator(options: RefreshCoordinatorOptions): RefreshCoordinator {
  let latest = 0;
  let pendingCards: Card[] | null = null;
  let running: Promise<void> | null = null;

  const drain = async () => {
    while (pendingCards) {
      const cards = pendingCards;
      pendingCards = null;
      try {
        await options.syncReminders(cards);
      } catch (error) {
        options.onSyncError?.(error);
      }
    }
    running = null;
  };

  const requestSync = (cards: Card[]) => {
    pendingCards = cards;
    if (!running) running = drain();
  };

  return {
    async load(read) {
      const ticket = ++latest;
      let snapshot: AppSnapshot;
      try {
        snapshot = await read();
      } catch (error) {
        if (ticket !== latest) return false;
        throw error;
      }
      if (ticket !== latest) return false;
      options.apply(snapshot);
      requestSync(snapshot.cards);
      return true;
    },
    async idle() {
      while (running) await running;
    },
  };
}

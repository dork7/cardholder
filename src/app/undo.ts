// How long the Undo bar offers to take a removal back.
export const UNDO_MS = 5000;

// Something already removed that can be put back: one or more documents moved to Recently deleted,
// a tag taken off a document. The removal itself has happened before it is offered; `undo` reverses it.
export interface Removal {
  // What the bar says, e.g. "Deleted Passport", "Deleted 3 cards", "Removed tag Car".
  message: string;
  undo(): Promise<void>;
}

// The app's single Undo offer. One removal at a time: offering another makes the previous one final
// (it can no longer be undone) and restarts the 5 seconds. Since every removal is already applied and
// deleted documents wait in Recently deleted, "final" only means the offer is gone; a process kill
// loses nothing.
export interface Undo {
  offer(removal: Removal): void;
  // Runs the current removal's undo, if any, and ends the offer. Rejects when the undo fails.
  undo(): Promise<void>;
  // Ends the offer without undoing, e.g. when the app goes to the background.
  end(): void;
  current(): Removal | null;
  // Called after every change to `current()`. Returns the unsubscribe.
  subscribe(listener: () => void): () => void;
}

export function createUndo(timeoutMs = UNDO_MS): Undo {
  let current: Removal | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const listeners = new Set<() => void>();

  const set = (next: Removal | null) => {
    if (timer) clearTimeout(timer);
    timer = next ? setTimeout(() => set(null), timeoutMs) : null;
    if (next === current) return;
    current = next;
    listeners.forEach((listener) => listener());
  };

  return {
    offer: (removal) => set(removal),
    async undo() {
      const removal = current;
      if (!removal) return;
      // Ended first, so a second tap can't run it twice.
      set(null);
      await removal.undo();
    },
    end: () => set(null),
    current: () => current,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

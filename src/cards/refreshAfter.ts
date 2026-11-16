// Refreshes the app's list after a change that has already happened. A failed refresh only leaves the
// screen stale until the next one, so it is logged, never thrown.
export const refreshAfter = (refresh: () => Promise<void>, what: string): Promise<void> =>
  refresh().catch((e) => console.warn(`Refresh after ${what} failed`, e));

import { makeCard } from '../../../test/fixtures';
import { Card } from '../../cards/types';
import { AppSnapshot, createRefreshCoordinator } from '../refreshCoordinator';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const snapshot = (cards: Card[], unlocked = false): AppSnapshot => ({ cards, folders: [], categories: [], unlocked });
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function setup() {
  const applied: AppSnapshot[] = [];
  const syncs: Array<{ cards: Card[]; done: ReturnType<typeof deferred<void>> }> = [];
  let inFlight = 0;
  let maxInFlight = 0;
  const errors: unknown[] = [];
  const coordinator = createRefreshCoordinator({
    apply: (s) => applied.push(s),
    syncReminders: async (cards) => {
      const done = deferred<void>();
      syncs.push({ cards, done });
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      try {
        await done.promise;
      } finally {
        inFlight -= 1;
      }
    },
    onSyncError: (e) => errors.push(e),
  });
  return { coordinator, applied, syncs, errors, maxInFlight: () => maxInFlight };
}

test('an older, slower refresh never overwrites a newer one', async () => {
  const { coordinator, applied } = setup();
  const older = deferred<AppSnapshot>();
  const newer = deferred<AppSnapshot>();

  const first = coordinator.load(() => older.promise);
  const second = coordinator.load(() => newer.promise);

  newer.resolve(snapshot([makeCard({ id: 'new' })], true));
  expect(await second).toBe(true);
  older.resolve(snapshot([makeCard({ id: 'old' })], false));
  expect(await first).toBe(false);

  expect(applied).toHaveLength(1);
  expect(applied[0].cards.map((c) => c.id)).toEqual(['new']);
  expect(applied[0].unlocked).toBe(true);
});

test('reminder syncs never overlap and the last one uses the newest cards', async () => {
  const { coordinator, syncs, maxInFlight } = setup();
  const withCard = [makeCard({ id: 'deleted-later' })];

  await coordinator.load(async () => snapshot(withCard));
  await flush();
  expect(syncs).toHaveLength(1); // first sync is now in flight

  // The card is deleted and two more refreshes land while the first sync is still running.
  await coordinator.load(async () => snapshot(withCard));
  await coordinator.load(async () => snapshot([]));
  await flush();
  expect(syncs).toHaveLength(1); // nothing started concurrently

  syncs[0].done.resolve();
  await flush();
  expect(syncs).toHaveLength(2); // intermediate request was coalesced away
  expect(syncs[1].cards).toEqual([]);

  syncs[1].done.resolve();
  await coordinator.idle();

  expect(maxInFlight()).toBe(1);
  expect(syncs).toHaveLength(2);
});

test('a superseded refresh does not schedule reminders from its stale cards', async () => {
  const { coordinator, syncs } = setup();
  const older = deferred<AppSnapshot>();

  const first = coordinator.load(() => older.promise);
  await coordinator.load(async () => snapshot([]));
  older.resolve(snapshot([makeCard({ id: 'stale' })]));
  await first;
  await flush();
  syncs.forEach((s) => s.done.resolve());
  await coordinator.idle();

  expect(syncs.map((s) => s.cards)).toEqual([[]]);
});

test('a failed read is swallowed when superseded and thrown when it is the newest', async () => {
  const { coordinator, applied } = setup();
  const older = deferred<AppSnapshot>();

  const first = coordinator.load(() => older.promise);
  await coordinator.load(async () => snapshot([]));
  older.reject(new Error('stale failure'));
  expect(await first).toBe(false);

  await expect(
    coordinator.load(async () => {
      throw new Error('current failure');
    }),
  ).rejects.toThrow('current failure');
  expect(applied).toHaveLength(1);
});

test('a failing reminder sync is reported and later syncs still run', async () => {
  const { coordinator, syncs, errors } = setup();

  await coordinator.load(async () => snapshot([makeCard({ id: 'a' })]));
  await flush();
  syncs[0].done.reject(new Error('notifications unavailable'));
  await coordinator.idle();
  expect(errors).toHaveLength(1);

  await coordinator.load(async () => snapshot([]));
  await flush();
  expect(syncs).toHaveLength(2);
  syncs[1].done.resolve();
  await coordinator.idle();
  expect(errors).toHaveLength(1);
});

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { AppState, AppStateStatus, StyleSheet } from 'react-native';
import { fields, images } from '../../../test/fixtures';
import { createMemoryBlobStore } from '../../../test/memoryBlobStore';
import { memoryDb } from '../../../test/memoryDb';
import { createMemoryVault } from '../../../test/memoryVault';
import { KeyVault } from '../../crypto/keyring';
import { BlobStore } from '../../storage/blobStore';
import { SqlDb } from '../../storage/sqlDb';
import { strings } from '../../strings';
import { Text } from '../../ui/Text';
import { AppContextValue, AppProvider, useApp, useBoot } from '../AppProvider';
import { BootScreen } from '../BootScreen';
import { deleteWithUndo } from '../../cards/deleteWithUndo';

let mockOpenDatabase: () => Promise<SqlDb>;
let mockBlobs: BlobStore;
let mockVault: KeyVault;
const mockSyncReminders = jest.fn();

jest.mock('../../storage/openDatabase', () => ({ openDatabase: () => mockOpenDatabase() }));
jest.mock('../../storage/fileBlobStore', () => ({ createFileBlobStore: () => mockBlobs }));
jest.mock('../../crypto/secureVault', () => ({
  secureVault: { get: () => mockVault.get(), set: (key: Uint8Array) => mockVault.set(key) },
}));
jest.mock('../../reminders/scheduler', () => ({
  syncReminders: (...args: unknown[]) => mockSyncReminders(...args),
}));

const RAW_NATIVE_ERROR = 'SQLITE_IOERR: disk I/O error at /private/var/mobile/secret.db';

let captured: AppContextValue[];

function Ready() {
  const app = useApp();
  captured.push(app);
  return <Text>{`cards:${app.cards.length}`}</Text>;
}

function Gate() {
  const { phase } = useBoot();
  return phase.status === 'ready' ? <Ready /> : <BootScreen />;
}

async function renderApp() {
  await render(
    <AppProvider>
      <Gate />
    </AppProvider>,
  );
}

beforeEach(() => {
  captured = [];
  const db = memoryDb();
  mockOpenDatabase = async () => db;
  mockBlobs = createMemoryBlobStore();
  mockVault = createMemoryVault();
  mockSyncReminders.mockReset();
  mockSyncReminders.mockResolvedValue(undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('refresh keeps one identity while cards and unlock state change', async () => {
  await renderApp();
  await screen.findByText('cards:0');

  const app = captured[captured.length - 1];
  await app.services.store.create(fields({ name: 'Gym' }), images('a'));
  await act(() => app.refresh());
  await screen.findByText('cards:1');

  expect(captured.length).toBeGreaterThan(1);
  expect(new Set(captured.map((c) => c.refresh)).size).toBe(1);
  expect(mockSyncReminders).toHaveBeenLastCalledWith([expect.objectContaining({ name: 'Gym' })], expect.any(Date), [], []);
});

test('a failed start shows localized copy and Retry, never the raw native error', async () => {
  const db = memoryDb();
  let calls = 0;
  mockOpenDatabase = async () => {
    calls += 1;
    if (calls === 1) throw new Error(RAW_NATIVE_ERROR);
    return db;
  };

  await renderApp();
  await screen.findByText(strings.boot.errorTitle);
  expect(screen.getByText(strings.boot.errorBody)).toBeTruthy();
  expect(screen.queryByText(RAW_NATIVE_ERROR)).toBeNull();
  expect(screen.queryByText(/SQLITE/)).toBeNull();

  await fireEvent.press(screen.getByRole('button', { name: strings.boot.retry }));
  await screen.findByText('cards:0');
  expect(calls).toBe(2);
});

test('Retry reuses the opened database when only a later boot step failed', async () => {
  const db = memoryDb();
  const open = jest.fn(async () => db);
  mockOpenDatabase = open;
  let vaultReads = 0;
  const inner = createMemoryVault();
  mockVault = {
    get: async () => {
      vaultReads += 1;
      if (vaultReads === 1) throw new Error(RAW_NATIVE_ERROR);
      return inner.get();
    },
    set: (key) => inner.set(key),
  };

  await renderApp();
  await screen.findByText(strings.boot.retry);
  await fireEvent.press(screen.getByRole('button', { name: strings.boot.retry }));
  await screen.findByText('cards:0');

  expect(open).toHaveBeenCalledTimes(1);
});

test('the recovery screen scrolls and keeps both actions inside the scroll container', async () => {
  const db = memoryDb();
  const blobs = createMemoryBlobStore();
  mockOpenDatabase = async () => db;
  mockBlobs = blobs;
  await renderApp();
  await screen.findByText('cards:0');
  await captured[captured.length - 1].services.store.create(fields(), images('a'));
  await screen.unmount();

  // Same data, different (empty) vault: the locked-cards recovery screen.
  mockVault = createMemoryVault();
  await renderApp();
  await screen.findByText(strings.boot.orphanedTitle);

  const scroll = screen.getByTestId('boot-scroll');
  expect(flatten(scroll.props.contentContainerStyle).flexGrow).toBe(1);
  const inside = within(scroll);
  expect(inside.getByRole('button', { name: strings.boot.importBackup })).toBeTruthy();
  expect(inside.getByRole('button', { name: strings.boot.startFresh })).toBeTruthy();
});

describe('Recently deleted', () => {
  const DAY = 24 * 60 * 60 * 1000;
  const START = Date.UTC(2026, 10, 15);

  // Boots, then moves one new document, and another 2 days later, to Recently deleted.
  async function bootWithDeleted(clock: { now: number }) {
    await renderApp();
    await screen.findByText('cards:0');
    const { store } = captured[captured.length - 1].services;
    const old = await store.create(fields({ name: 'Old' }), images('old'));
    await store.moveToRecentlyDeleted(old.id);
    clock.now += 2 * DAY;
    const recent = await store.create(fields({ name: 'Recent' }), images('recent'));
    await store.moveToRecentlyDeleted(recent.id);
    return { old, store };
  }

  test('documents deleted 30 days ago are erased, photos included, when the app starts', async () => {
    const clock = { now: START };
    jest.spyOn(Date, 'now').mockImplementation(() => clock.now);
    const { old } = await bootWithDeleted(clock);
    await screen.unmount();

    clock.now = START + 30 * DAY;
    await renderApp();
    await screen.findByText('cards:0');
    const { store } = captured[captured.length - 1].services;
    expect((await store.listRecentlyDeleted()).map((c) => c.name)).toEqual(['Recent']);
    expect((await mockBlobs.list()).filter((name) => name.startsWith(`${old.id}.`))).toEqual([]);
  });

  test('documents deleted 30 days ago are erased when the app comes back to the foreground', async () => {
    const clock = { now: START };
    jest.spyOn(Date, 'now').mockImplementation(() => clock.now);
    const listeners: ((state: AppStateStatus) => void)[] = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((type, listener) => {
      if (type === 'change') listeners.push(listener as (state: AppStateStatus) => void);
      return { remove: () => {} } as ReturnType<typeof AppState.addEventListener>;
    });
    const { store } = await bootWithDeleted(clock);

    clock.now = START + 32 * DAY;
    await act(async () => {
      for (const listener of listeners) listener('active');
    });
    await waitFor(async () => expect(await store.listRecentlyDeleted()).toEqual([]));
  });
});

describe('Undo', () => {
  function captureAppState() {
    const listeners: ((state: AppStateStatus) => void)[] = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((type, listener) => {
      if (type === 'change') listeners.push(listener as (state: AppStateStatus) => void);
      return { remove: () => {} } as ReturnType<typeof AppState.addEventListener>;
    });
    return (state: AppStateStatus) =>
      act(async () => {
        for (const listener of listeners) listener(state);
      });
  }

  test('a deleted document is gone from the list at once and Undo brings it back', async () => {
    await renderApp();
    await screen.findByText('cards:0');
    const app = captured[captured.length - 1];
    const card = await app.services.store.create(fields({ name: 'Passport', tags: ['ID'] }), images('passport'));
    await act(() => app.refresh());
    await screen.findByText('cards:1');

    await act(() => deleteWithUndo(app.services.store, app.undo, card, app.refresh));
    await screen.findByText('cards:0');
    expect(app.undo.current()?.message).toBe('Deleted Passport');

    await act(() => app.undo.undo());
    await screen.findByText('cards:1');
    expect(await app.services.store.get(card.id)).toMatchObject({ name: 'Passport', tags: ['ID'] });
    expect(await app.services.store.loadImage(card.id, 'front')).toBeTruthy();
  });

  test('going to the background ends the Undo offer; the document stays in Recently deleted', async () => {
    const emit = captureAppState();
    await renderApp();
    await screen.findByText('cards:0');
    const app = captured[captured.length - 1];
    const card = await app.services.store.create(fields({ name: 'Passport' }), images('passport'));
    await act(() => deleteWithUndo(app.services.store, app.undo, card, app.refresh));

    await emit('background');
    expect(app.undo.current()).toBeNull();
    expect((await app.services.store.listRecentlyDeleted()).map((c) => c.name)).toEqual(['Passport']);
  });
});

function flatten(style: unknown): { flexGrow?: number } {
  return (StyleSheet.flatten(style as never) ?? {}) as { flexGrow?: number };
}

test('refresh replans notes alongside documents, including removal', async () => {
  await renderApp();
  await screen.findByText('cards:0');
  const app = captured.at(-1)!;
  await app.services.notes.save('n', { title: 'Private', body: 'Secret' });
  await app.services.notes.setReminder('n', 1900000123456);
  await act(() => app.refresh());
  await waitFor(() => expect(mockSyncReminders).toHaveBeenLastCalledWith([], expect.any(Date), [expect.objectContaining({ id: 'n', reminderAt: 1900000123456 })], []));
  await app.services.notes.remove('n');
  await act(() => app.refresh());
  await waitFor(() => expect(mockSyncReminders).toHaveBeenLastCalledWith([], expect.any(Date), [], []));
});

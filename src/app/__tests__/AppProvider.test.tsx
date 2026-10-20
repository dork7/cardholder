import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
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
  expect(mockSyncReminders).toHaveBeenLastCalledWith([expect.objectContaining({ name: 'Gym' })]);
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

function flatten(style: unknown): { flexGrow?: number } {
  return (StyleSheet.flatten(style as never) ?? {}) as { flexGrow?: number };
}

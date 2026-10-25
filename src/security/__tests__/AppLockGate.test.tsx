import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AppState, AppStateStatus, Text } from 'react-native';
import { LOCK_AFTER_BACKGROUND_MS } from '../../config';
import { strings } from '../../strings';
import { AppLockGate } from '../AppLockGate';

const mockAuthenticate = jest.fn();
jest.mock('../deviceAuth', () => ({ authenticate: (...a: unknown[]) => mockAuthenticate(...a) }));
jest.mock('react-native-screens', () => ({ FullWindowOverlay: ({ children }: { children: React.ReactNode }) => children }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

let appStateListener: (state: AppStateStatus) => void = () => {};
let now = 1_000_000;

beforeEach(() => {
  jest.clearAllMocks();
  mockAuthenticate.mockResolvedValue('success');
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    appStateListener = listener as (state: AppStateStatus) => void;
    return { remove: () => {} } as ReturnType<typeof AppState.addEventListener>;
  });
  jest.spyOn(Date, 'now').mockImplementation(() => now);
});
afterEach(() => jest.restoreAllMocks());

const gate = (enabled: boolean) => (
  <AppLockGate enabled={enabled}>
    <Text>My cards</Text>
  </AppLockGate>
);
const changeState = (state: AppStateStatus) => act(async () => appStateListener(state));

test('with the lock off, the app just opens', async () => {
  await render(gate(false));
  expect(screen.queryByTestId('app-lock')).toBeNull();
  expect(mockAuthenticate).not.toHaveBeenCalled();
});

test('opens locked, asks the phone straight away, and opens on success', async () => {
  let finish: (r: string) => void = () => {};
  mockAuthenticate.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
  await render(gate(true));
  expect(screen.getByTestId('app-lock')).toBeTruthy();
  expect(mockAuthenticate).toHaveBeenCalledWith(strings.lock.prompt, strings.common.cancel);
  await act(async () => finish('success'));
  expect(screen.queryByTestId('app-lock')).toBeNull();
  expect(screen.getByText('My cards')).toBeTruthy();
});

test('a cancelled prompt stays locked; Unlock asks again', async () => {
  mockAuthenticate.mockResolvedValueOnce('failed');
  await render(gate(true));
  expect(screen.getByTestId('app-lock')).toBeTruthy();
  await fireEvent.press(screen.getByTestId('unlock'));
  expect(mockAuthenticate).toHaveBeenCalledTimes(2);
  expect(screen.queryByTestId('app-lock')).toBeNull();
});

test('a phone whose lock was removed is not shut out', async () => {
  mockAuthenticate.mockResolvedValueOnce('no-device-lock');
  await render(gate(true));
  expect(screen.queryByTestId('app-lock')).toBeNull();
});

test('locks again after a long trip to the background, not a short one', async () => {
  await render(gate(true));
  expect(screen.queryByTestId('app-lock')).toBeNull();

  await changeState('background');
  now += LOCK_AFTER_BACKGROUND_MS - 1;
  await changeState('active');
  expect(screen.queryByTestId('app-lock')).toBeNull();

  mockAuthenticate.mockResolvedValueOnce('failed');
  await changeState('background');
  now += LOCK_AFTER_BACKGROUND_MS;
  await changeState('active');
  expect(screen.getByTestId('app-lock')).toBeTruthy();
  expect(mockAuthenticate).toHaveBeenCalledTimes(2);
});

test('the unlock prompt sending the app to the background does not count as leaving', async () => {
  let finish: (r: string) => void = () => {};
  mockAuthenticate.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
  await render(gate(true));
  await changeState('background'); // e.g. Android's PIN screen
  now += LOCK_AFTER_BACKGROUND_MS * 2;
  await changeState('active');
  await act(async () => finish('success'));
  expect(screen.queryByTestId('app-lock')).toBeNull();
  expect(mockAuthenticate).toHaveBeenCalledTimes(1);
});

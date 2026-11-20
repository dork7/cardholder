import { act, render, renderHook, screen } from '@testing-library/react-native';
import * as QuickActions from 'expo-quick-actions';
import { ReactNode } from 'react';
import { Text } from 'react-native';
import { AppLockGate } from '../../security/AppLockGate';
import { useLaunchLinks } from '../useLaunchLinks';

jest.mock('expo-quick-actions', () => ({
  initial: undefined,
  addListener: jest.fn(() => ({ remove: jest.fn() })),
}));
let mockResponse: unknown = null;
jest.mock('expo-notifications', () => ({
  useLastNotificationResponse: () => mockResponse,
  DEFAULT_ACTION_IDENTIFIER: 'tap',
}));
const mockRouter = { push: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
const mockAuthenticate = jest.fn();
jest.mock('../../security/deviceAuth', () => ({ authenticate: () => mockAuthenticate() }));
jest.mock('react-native-screens', () => ({ FullWindowOverlay: ({ children }: { children: ReactNode }) => children }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));

const action = (href: string): QuickActions.Action => ({ id: href, title: href, params: { href } });
const launch = async (href: string) => {
  const callback = jest.mocked(QuickActions.addListener).mock.calls.at(-1)![0];
  await act(async () => callback(action(href)));
};

beforeEach(() => {
  jest.clearAllMocks();
  mockResponse = null;
  jest.replaceProperty(QuickActions, 'initial', undefined);
  mockAuthenticate.mockResolvedValue('failed');
});
afterEach(() => jest.restoreAllMocks());

test('a cold shortcut opens once even when Home re-renders', async () => {
  jest.replaceProperty(QuickActions, 'initial', action('/note/new'));
  const { rerender } = await renderHook(() => useLaunchLinks());
  expect(mockRouter.push).toHaveBeenCalledWith('/note/new');
  await rerender({});
  expect(mockRouter.push).toHaveBeenCalledTimes(1);
});

test('a shortcut waits behind app lock and opens after successful authentication', async () => {
  let finish!: (result: string) => void;
  mockAuthenticate.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  jest.replaceProperty(QuickActions, 'initial', action('/card/id_1?show=1'));
  await renderHook(() => useLaunchLinks(), {
    wrapper: ({ children }: { children: ReactNode }) => <AppLockGate enabled>{children}</AppLockGate>,
  });
  expect(screen.getByTestId('app-lock')).toBeTruthy();
  expect(mockRouter.push).not.toHaveBeenCalled();
  await act(async () => finish('success'));
  expect(screen.queryByTestId('app-lock')).toBeNull();
  expect(mockRouter.push.mock.calls).toEqual([['/card/id_1?show=1']]);
});

test('warm shortcuts open the import editor or Show mode and reject unrelated destinations', async () => {
  await renderHook(() => useLaunchLinks());
  await launch('/edit/new');
  await launch('/card/id_1?show=1');
  await launch('/settings');
  expect(mockRouter.push.mock.calls).toEqual([['/edit/new'], ['/card/id_1?show=1']]);
});

function Home() { useLaunchLinks(); return <Text>Note screen</Text>; }

test('a notification opens its note underneath the app lock and is handled once', async () => {
  let unlock!: (result: string) => void;
  mockAuthenticate.mockReturnValue(new Promise((resolve) => { unlock = resolve; }));
  mockResponse = { actionIdentifier: 'tap', notification: { request: { identifier: 'note:n', content: { data: { noteId: 'n' } } } } };
  const view = <AppLockGate enabled><Home /></AppLockGate>;
  await render(view);
  expect(mockRouter.push).toHaveBeenCalledWith('/note-view/n');
  expect(screen.getByTestId('app-lock')).toBeTruthy();
  expect(screen.queryByText('Note screen')).toBeNull();
  await screen.rerender(view);
  expect(mockRouter.push).toHaveBeenCalledTimes(1);
  await act(async () => unlock('success'));
  expect(screen.queryByTestId('app-lock')).toBeNull();
  expect(screen.getByText('Note screen')).toBeTruthy();
});

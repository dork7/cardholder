import { act, renderHook, screen } from '@testing-library/react-native';
import * as QuickActions from 'expo-quick-actions';
import { ReactNode } from 'react';
import { AppLockGate } from '../../security/AppLockGate';
import { useLaunchLinks } from '../useLaunchLinks';

jest.mock('expo-quick-actions', () => ({
  initial: undefined,
  addListener: jest.fn(() => ({ remove: jest.fn() })),
}));
jest.mock('expo-notifications', () => ({ useLastNotificationResponse: () => null }));
const mockRouter = { push: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
const mockAuthenticate = jest.fn();
jest.mock('../../security/deviceAuth', () => ({ authenticate: () => mockAuthenticate() }));
jest.mock('react-native-screens', () => ({ FullWindowOverlay: ({ children }: { children: ReactNode }) => children }));

const action = (href: string): QuickActions.Action => ({ id: href, title: href, params: { href } });
const launch = async (href: string) => {
  const callback = jest.mocked(QuickActions.addListener).mock.calls.at(-1)![0];
  await act(async () => callback(action(href)));
};

beforeEach(() => {
  jest.clearAllMocks();
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

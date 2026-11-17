import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AppLockGate } from '../../security/AppLockGate';
import { useLaunchLinks } from '../useLaunchLinks';

const mockPush = jest.fn();
const mockRouter = { push: mockPush };
const mockAuthenticate = jest.fn();
let mockResponse: unknown = null;
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
jest.mock('expo-notifications', () => ({
  useLastNotificationResponse: () => mockResponse,
  DEFAULT_ACTION_IDENTIFIER: 'tap',
}));
jest.mock('expo-quick-actions/hooks', () => ({ useQuickActionCallback: jest.fn() }));
jest.mock('../../security/deviceAuth', () => ({ authenticate: () => mockAuthenticate() }));
jest.mock('react-native-screens', () => ({ FullWindowOverlay: ({ children }: { children: React.ReactNode }) => children }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));

function Home() { useLaunchLinks(); return <Text>Note screen</Text>; }

test('a notification opens its note underneath the app lock and is handled once', async () => {
  let unlock!: (result: string) => void;
  mockAuthenticate.mockReturnValue(new Promise((resolve) => { unlock = resolve; }));
  mockResponse = { actionIdentifier: 'tap', notification: { request: { identifier: 'note:n', content: { data: { noteId: 'n' } } } } };
  const view = <AppLockGate enabled><Home /></AppLockGate>;
  await render(view);
  expect(mockPush).toHaveBeenCalledWith('/note/n');
  expect(screen.getByTestId('app-lock')).toBeTruthy();
  expect(screen.queryByText('Note screen')).toBeNull();
  await screen.rerender(view);
  expect(mockPush).toHaveBeenCalledTimes(1);
  await act(async () => unlock('success'));
  expect(screen.queryByTestId('app-lock')).toBeNull();
  expect(screen.getByText('Note screen')).toBeTruthy();
});

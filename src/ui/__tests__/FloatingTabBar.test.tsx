import { fireEvent, render, screen } from '@testing-library/react-native';
import { FloatingTabBar } from '../FloatingTabBar';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace, push: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

beforeEach(() => mockReplace.mockClear());

test('the active tab is selected and the others navigate by replacing', async () => {
  await render(<FloatingTabBar active="notes" />);
  expect(screen.getByTestId('tab-notes').props.accessibilityState).toEqual({ selected: true });
  expect(screen.getByTestId('tab-home').props.accessibilityState).toEqual({ selected: false });
  await fireEvent.press(screen.getByTestId('tab-notes'));
  expect(mockReplace).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByTestId('tab-settings'));
  expect(mockReplace).toHaveBeenCalledWith('/settings');
  await fireEvent.press(screen.getByTestId('tab-home'));
  expect(mockReplace).toHaveBeenCalledWith('/');
});

test('folders is hidden while the feature is off', async () => {
  await render(<FloatingTabBar active="home" />);
  expect(screen.queryByTestId('tab-folders')).toBeNull();
});

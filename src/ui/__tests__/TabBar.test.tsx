import { fireEvent, render, screen } from '@testing-library/react-native';
import { Fab } from '../Fab';
import { TabBar } from '../TabBar';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }) }));

beforeEach(() => mockReplace.mockClear());

test('four tabs, with the current one announced as selected', async () => {
  await render(<TabBar active="notes" />);
  for (const key of ['documents', 'notes', 'folders', 'settings']) {
    expect(screen.getByTestId(`tab-${key}`).props.accessibilityRole).toBe('tab');
  }
  expect(screen.getByTestId('tab-notes').props.accessibilityState).toEqual({ selected: true });
  expect(screen.getByTestId('tab-documents').props.accessibilityState).toEqual({ selected: false });
});

test('tapping another tab replaces the screen; tapping the current one does nothing', async () => {
  await render(<TabBar active="documents" />);
  await fireEvent.press(screen.getByTestId('tab-documents'));
  expect(mockReplace).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByTestId('tab-folders'));
  expect(mockReplace).toHaveBeenCalledWith('/folders');
  await fireEvent.press(screen.getByTestId('tab-settings'));
  expect(mockReplace).toHaveBeenCalledWith('/settings');
});

test('the + button is labelled and presses through', async () => {
  const onPress = jest.fn();
  await render(<Fab label="Add image" onPress={onPress} testID="fab" />);
  await fireEvent.press(screen.getByRole('button', { name: 'Add image' }));
  expect(onPress).toHaveBeenCalled();
});

import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { IconButton } from '../IconButton';
import { TOOLTIP_MS } from '../Tooltip';

// The native methods every mocked host view shares in tests (untyped JS in the jest preset).
const MockNativeMethods: { measureInWindow: jest.Mock } = require('@react-native/jest-preset/jest/MockNativeMethods').default;

beforeEach(() => {
  jest.useFakeTimers();
  // Where the button sits on screen; the tooltip is placed against it.
  MockNativeMethods.measureInWindow.mockImplementation((cb: (...r: number[]) => void) => cb(100, 600, 56, 56));
});

afterEach(() => jest.useRealTimers());

test('a long press on an icon button shows its label, which goes away by itself', async () => {
  const onPress = jest.fn();
  await render(<IconButton icon="share" label="Share" onPress={onPress} testID="share" />);
  expect(screen.queryByTestId('tooltip')).toBeNull();

  await act(async () => fireEvent(screen.getByTestId('share'), 'longPress'));
  expect(screen.getByTestId('tooltip')).toBeTruthy();
  expect(screen.getByText('Share')).toBeTruthy();
  expect(onPress).not.toHaveBeenCalled();

  await act(async () => jest.advanceTimersByTime(TOOLTIP_MS));
  expect(screen.queryByTestId('tooltip')).toBeNull();
});

test('a plain tap still does the action and shows no tooltip', async () => {
  const onPress = jest.fn();
  await render(<IconButton icon="share" label="Share" onPress={onPress} testID="share" />);
  await act(async () => fireEvent.press(screen.getByTestId('share')));
  expect(onPress).toHaveBeenCalled();
  expect(screen.queryByTestId('tooltip')).toBeNull();
});

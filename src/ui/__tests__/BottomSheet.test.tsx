import { fireEvent, render, screen } from '@testing-library/react-native';
import { BottomSheet } from '../BottomSheet';
import { Text } from '../Text';

test('a hidden sheet renders nothing; an open one has a header, content and a Close that closes', async () => {
  const onClose = jest.fn();
  const view = await render(<BottomSheet visible={false} title="Sort" onClose={onClose} testID="s"><Text>Body</Text></BottomSheet>);
  expect(screen.queryByTestId('s')).toBeNull();
  await view.rerender(<BottomSheet visible title="Sort" onClose={onClose} testID="s"><Text>Body</Text></BottomSheet>);
  expect(screen.getByRole('header', { name: 'Sort' })).toBeTruthy();
  expect(screen.getByText('Body')).toBeTruthy();
  await fireEvent.press(screen.getByTestId('s-close'));
  expect(onClose).toHaveBeenCalledTimes(1);
});

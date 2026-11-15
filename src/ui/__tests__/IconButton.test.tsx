import { render, screen } from '@testing-library/react-native';
import { IconButton } from '../IconButton';

test('a caption wraps onto a second line at large text sizes instead of being cut off', async () => {
  await render(<IconButton icon="share" label="Quick share" caption="Share" onPress={() => {}} />);
  expect(screen.getByText('Share').props.numberOfLines).toBe(2);
});

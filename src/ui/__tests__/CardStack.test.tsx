import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { makeCard } from '../../../test/fixtures';
import { strings } from '../../strings';
import { CardStack } from '../CardStack';

// Gestures are covered by the geometry tests; here they are inert so the accessible paths can be driven.
jest.mock('react-native-gesture-handler', () => ({
  GestureDetector: ({ children }: { children: React.ReactNode }) => children,
  usePanGesture: () => ({}),
}));
// Icon fonts load as assets, which the test environment has none of.
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../../app/AppProvider', () => ({
  useApp: () => ({ services: { store: { loadImage: () => Promise.resolve(null) } } }),
}));

const cards = [
  makeCard({ id: 'a', name: 'Emirates ID', category: 'id' }),
  makeCard({ id: 'b', name: 'Health insurance', category: 'insurance' }),
  makeCard({ id: 'c', name: 'Gym', category: 'membership' }),
];

async function renderStack(onOpen = jest.fn(), onPin?: jest.Mock) {
  await render(<CardStack cards={cards} onOpen={onOpen} onPin={onPin} />);
  // The stack measures the space it has before drawing the cards.
  await act(async () => {
    fireEvent(screen.getByTestId('card-stack-frame'), 'layout', {
      nativeEvent: { layout: { width: 340, height: 500, x: 0, y: 0 } },
    });
  });
  return onOpen;
}

test('the stack tells assistive tech which card is in front', async () => {
  await renderStack();
  const stack = screen.getByTestId('card-stack');
  expect(stack.props.accessibilityLabel).toBe('Emirates ID');
  expect(stack.props.accessibilityValue).toEqual({ text: strings.home.cardOf(1, 3) });
});

test('activating the stack opens the front card', async () => {
  const onOpen = await renderStack();
  fireEvent(screen.getByTestId('card-stack'), 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
  expect(onOpen).toHaveBeenCalledWith(cards[0]);
});

test('a pager dot brings that card straight to the front', async () => {
  await renderStack();
  fireEvent.press(screen.getByRole('button', { name: strings.home.showCard(3, 3) }));
  await waitFor(() => expect(screen.getByTestId('card-stack').props.accessibilityLabel).toBe('Gym'));
  expect(screen.getByText('Membership')).toBeTruthy();
});

test('swiping forward with assistive tech moves to the next card', async () => {
  await renderStack();
  fireEvent(screen.getByTestId('card-stack'), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
  await waitFor(() => expect(screen.getByTestId('card-stack').props.accessibilityLabel).toBe('Health insurance'));
});

test('a single card has no pager', async () => {
  await render(<CardStack cards={[cards[0]]} onOpen={jest.fn()} />);
  expect(screen.queryByRole('button')).toBeNull();
});

test('the pin button pins the front card', async () => {
  const onPin = jest.fn();
  await renderStack(jest.fn(), onPin);
  fireEvent.press(screen.getByRole('button', { name: strings.card.unpin })); // fixture cards start pinned
  expect(onPin).toHaveBeenCalledWith(cards[0]);
});

test('cards behind the front one show only their names', async () => {
  await renderStack();
  expect(screen.getByText('Health insurance')).toBeTruthy();
  expect(screen.queryByText('Insurance')).toBeNull();
});

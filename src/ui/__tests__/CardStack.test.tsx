import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { makeCard } from '../../../test/fixtures';
import { strings } from '../../strings';
import { CardStack } from '../CardStack';

// Gestures are covered by the geometry tests; here they are inert so the accessible paths can be driven.
jest.mock('react-native-gesture-handler', () => ({
  GestureDetector: ({ children }: { children: React.ReactNode }) => children,
  usePanGesture: () => ({}),
  useTapGesture: () => ({}),
  useCompetingGestures: () => ({}),
}));
jest.mock('../../app/AppProvider', () => ({
  useApp: () => ({ services: { store: { loadImage: () => Promise.resolve(null) } } }),
}));

const cards = [
  makeCard({ id: 'a', name: 'Emirates ID', category: 'id' }),
  makeCard({ id: 'b', name: 'Health insurance', category: 'insurance' }),
  makeCard({ id: 'c', name: 'Gym', category: 'membership' }),
];

async function renderStack(onOpen = jest.fn()) {
  await render(<CardStack cards={cards} onOpen={onOpen} />);
  // The stack measures its width before drawing the cards.
  await act(async () => {
    fireEvent(screen.getByTestId('card-stack-frame'), 'layout', {
      nativeEvent: { layout: { width: 340, height: 0, x: 0, y: 0 } },
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

describe('flipping', () => {
  const twoSided = [makeCard({ id: 'a', name: 'Emirates ID', category: 'id', hasBack: true, backAspect: 1.586 }), cards[1]];

  async function renderTwoSided() {
    await render(<CardStack cards={twoSided} onOpen={jest.fn()} />);
    await act(async () => {
      fireEvent(screen.getByTestId('card-stack-frame'), 'layout', {
        nativeEvent: { layout: { width: 340, height: 0, x: 0, y: 0 } },
      });
    });
  }

  test('a card with a back offers a flip button that toggles which side it shows', async () => {
    await renderTwoSided();
    await fireEvent.press(screen.getByRole('button', { name: strings.home.showBack }));
    expect(screen.getByRole('button', { name: strings.home.showFront })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: strings.home.showFront }));
    expect(screen.getByRole('button', { name: strings.home.showBack })).toBeTruthy();
  });

  test('a card without a back has no flip button', async () => {
    await renderStack();
    expect(screen.queryByTestId('flip-card')).toBeNull();
  });

  test('assistive tech can flip the front card too', async () => {
    await renderTwoSided();
    await act(async () => {
      fireEvent(screen.getByTestId('card-stack'), 'accessibilityAction', { nativeEvent: { actionName: 'flip' } });
    });
    expect(screen.getByRole('button', { name: strings.home.showFront })).toBeTruthy();
  });

  test('moving to another card turns the flipped one face up again', async () => {
    await renderTwoSided();
    await fireEvent.press(screen.getByRole('button', { name: strings.home.showBack }));
    await act(async () => {
      fireEvent(screen.getByTestId('card-stack'), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    });
    await waitFor(() => expect(screen.getByTestId('card-stack').props.accessibilityLabel).toBe('Health insurance'));
    expect(screen.queryByTestId('flip-card')).toBeNull();
    await act(async () => {
      fireEvent(screen.getByTestId('card-stack'), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    });
    await waitFor(() => expect(screen.getByTestId('card-stack').props.accessibilityLabel).toBe('Emirates ID'));
    expect(screen.getByRole('button', { name: strings.home.showBack })).toBeTruthy();
  });
});

import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { makeCard } from '../../../test/fixtures';
import Home from '../../../app/index';
import { strings } from '../../strings';

let mockCards = [
  makeCard({ id: 'a', name: 'Emirates ID', category: 'id' }),
  makeCard({ id: 'b', name: 'Health insurance', category: 'insurance' }),
  makeCard({ id: 'c', name: 'Gym', category: 'membership' }),
];

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('react-native-gesture-handler', () => ({
  GestureDetector: ({ children }: { children: React.ReactNode }) => children,
  usePanGesture: () => ({}),
  useTapGesture: () => ({}),
  useCompetingGestures: () => ({}),
}));
jest.mock('../../app/AppProvider', () => ({
  useApp: () => ({
    cards: mockCards,
    services: { store: { loadImage: () => Promise.resolve(null) } },
  }),
}));

async function renderHome() {
  await render(<Home />);
  await act(async () => {
    fireEvent(screen.getByTestId('card-stack-frame'), 'layout', {
      nativeEvent: { layout: { width: 340, height: 0, x: 0, y: 0 } },
    });
  });
}

test('the stack shows every card until a type is chosen', async () => {
  await renderHome();
  expect(screen.getByTestId('card-stack').props.accessibilityValue).toEqual({ text: strings.home.cardOf(1, 3) });
});

test('choosing a type narrows the stack to cards of that type', async () => {
  await renderHome();
  await act(async () => fireEvent.press(screen.getByRole('radio', { name: strings.categories.insurance })));
  await act(async () => {
    fireEvent(screen.getByTestId('card-stack-frame'), 'layout', {
      nativeEvent: { layout: { width: 340, height: 0, x: 0, y: 0 } },
    });
  });
  const stack = screen.getByTestId('card-stack');
  expect(stack.props.accessibilityLabel).toBe('Health insurance');
  expect(stack.props.accessibilityValue).toEqual({ text: strings.home.cardOf(1, 1) });
});

test('types with no cards are not offered', async () => {
  await renderHome();
  expect(screen.getByRole('radio', { name: strings.categories.id })).toBeTruthy();
  expect(screen.queryByRole('radio', { name: strings.categories.other })).toBeNull();
});

test('with only one type there is nothing to filter, so no filter is shown', async () => {
  const all = mockCards;
  mockCards = [makeCard({ id: 'a', name: 'Emirates ID', category: 'id' }), makeCard({ id: 'b', name: 'Visa', category: 'id' })];
  try {
    await renderHome();
    expect(screen.queryByRole('radio')).toBeNull();
  } finally {
    mockCards = all;
  }
});

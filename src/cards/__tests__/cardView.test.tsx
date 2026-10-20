import { render, screen, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { makeCard } from '../../../test/fixtures';
import CardView from '../../../app/card/[id]';
import { strings } from '../../strings';

let mockCards: ReturnType<typeof makeCard>[] = [];
const mockLoadImage = jest.fn((id: string, side: string) => Promise.resolve(`${id}-${side}`));

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'card1' }),
  useRouter: () => ({ back: jest.fn(), replace: jest.fn() }),
}));
jest.mock('expo-brightness', () => ({
  getBrightnessAsync: () => Promise.resolve(0.5),
  setBrightnessAsync: () => Promise.resolve(),
}));
jest.mock('expo-sharing', () => ({ shareAsync: jest.fn() }));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('react-native-gesture-handler', () => ({
  GestureDetector: ({ children }: { children: React.ReactNode }) => children,
  usePinchGesture: () => ({}),
  useTapGesture: () => ({}),
  useSimultaneousGestures: () => ({}),
}));
// Stable like the real provider's memoised value; a fresh object per render would reload images forever.
const mockServices = { store: { loadImage: (id: string, side: string) => mockLoadImage(id, side), remove: jest.fn() } };
jest.mock('../../app/AppProvider', () => ({
  useApp: () => ({ services: mockServices, cards: mockCards, refresh: jest.fn() }),
}));

beforeEach(() => mockLoadImage.mockClear());

const imageUri = (label: string) => screen.getByLabelText(label).props.source?.uri ?? screen.getByLabelText(label).props.source?.[0]?.uri;

test('shows the front and the back of the card', async () => {
  mockCards = [makeCard({ id: 'card1', name: 'Gym', hasBack: true, backAspect: 1.586 })];
  await render(<CardView />);
  await waitFor(() => expect(imageUri(strings.card.imageLabel('Gym', strings.card.front))).toBe('data:image/jpeg;base64,card1-front'));
  expect(imageUri(strings.card.imageLabel('Gym', strings.card.back))).toBe('data:image/jpeg;base64,card1-back');
});

test('the photo fills its frame instead of collapsing to zero width', async () => {
  mockCards = [makeCard({ id: 'card1', name: 'Gym' })];
  await render(<CardView />);
  await waitFor(() => screen.getByLabelText(strings.card.imageLabel('Gym', strings.card.front)));
  const style = StyleSheet.flatten(screen.getByLabelText(strings.card.imageLabel('Gym', strings.card.front)).props.style);
  expect(style).toMatchObject({ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 });
});

test('a card without a back shows only the front', async () => {
  mockCards = [makeCard({ id: 'card1', name: 'Gym', hasBack: false })];
  await render(<CardView />);
  await waitFor(() => screen.getByLabelText(strings.card.imageLabel('Gym', strings.card.front)));
  expect(screen.queryByLabelText(strings.card.imageLabel('Gym', strings.card.back))).toBeNull();
  expect(mockLoadImage).not.toHaveBeenCalledWith('card1', 'back');
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert, StyleSheet } from 'react-native';
import { makeCard } from '../../../test/fixtures';
import CardView from '../../../app/card/[id]';
import { strings } from '../../strings';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockRefresh = jest.fn(() => Promise.resolve());
let mockCards: ReturnType<typeof makeCard>[] = [];
const mockLoadImage = jest.fn((id: string, side: string) => Promise.resolve(`${id}-${side}`));

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'card1' }),
  useRouter: () => ({ back: () => mockBack(), push: (...a: unknown[]) => mockPush(...a) }),
}));
jest.mock('expo-brightness', () => ({
  getBrightnessAsync: () => Promise.resolve(0.5),
  setBrightnessAsync: () => Promise.resolve(),
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('expo-sharing', () => ({ shareAsync: jest.fn() }));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('react-native-gesture-handler', () => ({
  GestureDetector: ({ children }: { children: React.ReactNode }) => children,
  usePinchGesture: () => ({}),
  useTapGesture: () => ({}),
  useSimultaneousGestures: () => ({}),
}));
// Stable like the real provider's memoised value; a fresh object per render would reload images forever.
const mockRemove = jest.fn((_id: string) => Promise.resolve());
const mockServices = { store: { loadImage: (id: string, side: string) => mockLoadImage(id, side), remove: (id: string) => mockRemove(id) } };
jest.mock('../../app/AppProvider', () => ({
  useApp: () => ({ services: mockServices, cards: mockCards, refresh: () => mockRefresh() }),
}));

beforeEach(() => jest.clearAllMocks());

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

describe('actions', () => {
  let alert: jest.SpyInstance;
  beforeEach(() => {
    mockCards = [makeCard({ id: 'card1', name: 'Gym' })];
    alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });
  afterEach(() => alert.mockRestore());

  // Alert.alert(title, body, buttons): press the button with this label.
  const pressInAlert = async (label: string) => {
    const buttons = alert.mock.calls[0][2] as { text: string; onPress?: () => unknown }[];
    await buttons.find((b) => b.text === label)?.onPress?.();
  };

  test('delete, share and edit are icon buttons named for screen readers, with Close below them', async () => {
    await render(<CardView />);
    for (const name of [strings.edit.deleteCard, strings.card.share, strings.card.edit, strings.common.close]) {
      expect(screen.getByRole('button', { name })).toBeTruthy();
    }
  });

  test('Edit opens this card in the edit screen', async () => {
    await render(<CardView />);
    await fireEvent.press(screen.getByRole('button', { name: strings.card.edit }));
    expect(mockPush).toHaveBeenCalledWith('/edit/card1');
  });

  test('Delete asks first; confirming removes the card and goes back', async () => {
    await render(<CardView />);
    await fireEvent.press(screen.getByRole('button', { name: strings.edit.deleteCard }));
    expect(alert).toHaveBeenCalledWith(strings.edit.deleteConfirmTitle, strings.edit.deleteConfirmBody, expect.any(Array));
    expect(mockRemove).not.toHaveBeenCalled();
    await pressInAlert(strings.common.delete);
    expect(mockRemove).toHaveBeenCalledWith('card1');
    expect(mockRefresh).toHaveBeenCalled();
    expect(mockBack).toHaveBeenCalled();
  });

  test('cancelling the delete keeps the card', async () => {
    await render(<CardView />);
    await fireEvent.press(screen.getByRole('button', { name: strings.edit.deleteCard }));
    await pressInAlert(strings.common.cancel);
    expect(mockRemove).not.toHaveBeenCalled();
    expect(mockBack).not.toHaveBeenCalled();
  });
});

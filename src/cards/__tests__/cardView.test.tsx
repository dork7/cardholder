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

let mockScreenOptions: Record<string, unknown> = {};
jest.mock('expo-router', () => ({
  Stack: { Screen: ({ options }: { options: Record<string, unknown> }) => ((mockScreenOptions = options), null) },
  useLocalSearchParams: () => ({ id: 'card1' }),
  useRouter: () => ({ back: () => mockBack(), push: (...a: unknown[]) => mockPush(...a) }),
}));
jest.mock('expo-brightness', () => ({
  getBrightnessAsync: () => Promise.resolve(0.5),
  setBrightnessAsync: () => Promise.resolve(),
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
const mockLockOrientation = jest.fn((_lock: number) => Promise.resolve());
jest.mock('expo-screen-orientation', () => ({
  OrientationLock: { DEFAULT: 0, PORTRAIT_UP: 3 },
  lockAsync: (lock: number) => mockLockOrientation(lock),
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
const mockRemove = jest.fn((_id: string) => Promise.resolve());
const mockSetPinned = jest.fn((_id: string, _pinned: boolean) => Promise.resolve());
const mockServices = {
  store: {
    loadImage: (id: string, side: string) => mockLoadImage(id, side),
    remove: (id: string) => mockRemove(id),
    setPinned: (id: string, pinned: boolean) => mockSetPinned(id, pinned),
  },
};
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

test('Pin puts the card on the home page; a pinned card offers Unpin', async () => {
  mockCards = [makeCard({ id: 'card1', pinned: false })];
  await render(<CardView />);
  await fireEvent.press(screen.getByRole('button', { name: strings.card.pin }));
  expect(mockSetPinned).toHaveBeenCalledWith('card1', true);
  expect(mockRefresh).toHaveBeenCalled();

  mockCards = [makeCard({ id: 'card1', pinned: true })];
  await render(<CardView />);
  await fireEvent.press(screen.getByRole('button', { name: strings.card.unpin }));
  expect(mockSetPinned).toHaveBeenCalledWith('card1', false);
});

test('shows how close the expiry is, and the tags on the card', async () => {
  jest.useFakeTimers({ now: new Date(2026, 9, 25, 12, 0), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
  try {
    mockCards = [makeCard({ id: 'card1', expiresOn: '2026-10-30', tags: ['Health', 'Work'] })];
    await render(<CardView />);
    expect(screen.getByTestId('card-expiry').props.children).toBe(strings.card.expiresIn(5));
    expect(screen.getByText('Health')).toBeTruthy();
    expect(screen.getByText('Work')).toBeTruthy();
  } finally {
    jest.useRealTimers();
  }
});

test('the card view may turn sideways; leaving it locks portrait again', async () => {
  mockCards = [makeCard({ id: 'card1' })];
  await render(<CardView />);
  expect(mockLockOrientation).toHaveBeenLastCalledWith(0);
  await screen.unmount();
  expect(mockLockOrientation).toHaveBeenLastCalledWith(3);
});

test('in landscape the front and back sit side by side, with only Close below', async () => {
  const dims = jest.spyOn(require('react-native'), 'useWindowDimensions').mockReturnValue({ width: 844, height: 390, scale: 3, fontScale: 1 });
  try {
    mockCards = [makeCard({ id: 'card1', name: 'Gym', hasBack: true, backAspect: 1.586 })];
    await render(<CardView />);
    expect(StyleSheet.flatten(screen.getByTestId('card-sides').props.style).flexDirection).toBe('row');
    expect(screen.getByLabelText(strings.card.imageLabel('Gym', strings.card.back))).toBeTruthy();
    expect(screen.queryByTestId('edit-card')).toBeNull();
    expect(screen.getByTestId('close-card')).toBeTruthy();
  } finally {
    dims.mockRestore();
  }
});

describe('show to staff', () => {
  beforeEach(() => {
    mockCards = [makeCard({ id: 'card1' })];
  });

  test('locks the screen to the card: no actions, no Close, no swipe away, no back', async () => {
    const back = jest.spyOn(require('react-native').BackHandler, 'addEventListener');
    await render(<CardView />);
    expect(mockScreenOptions.gestureEnabled).toBe(true);
    await fireEvent.press(screen.getByRole('button', { name: strings.card.showToStaff }));
    for (const id of ['delete-card', 'share-card', 'pin-card', 'edit-card', 'close-card']) {
      expect(screen.queryByTestId(id)).toBeNull();
    }
    expect(mockScreenOptions.gestureEnabled).toBe(false);
    const handler = back.mock.calls.at(-1)?.[1] as () => boolean;
    expect(handler()).toBe(true); // Android back is swallowed
    back.mockRestore();
  });

  test('a tap on finish only explains; holding it unlocks', async () => {
    await render(<CardView />);
    await fireEvent.press(screen.getByTestId('show-to-staff'));
    await fireEvent.press(screen.getByTestId('finish-staff'));
    expect(screen.getByText(strings.card.staffHoldReminder)).toBeTruthy();
    expect(screen.queryByTestId('close-card')).toBeNull();
    await fireEvent(screen.getByTestId('finish-staff'), 'longPress');
    expect(screen.getByTestId('close-card')).toBeTruthy();
    expect(mockScreenOptions.gestureEnabled).toBe(true);
  });
});

test('Send to phone opens the code screen; for an ID it asks first', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  mockCards = [makeCard({ id: 'card1', category: 'membership' })];
  await render(<CardView />);
  await fireEvent.press(screen.getByRole('button', { name: strings.transfer.send }));
  expect(mockPush).toHaveBeenCalledWith('/send/card1');

  mockPush.mockClear();
  mockCards = [makeCard({ id: 'card1', category: 'id' })];
  await render(<CardView />);
  await fireEvent.press(screen.getByRole('button', { name: strings.transfer.send }));
  expect(mockPush).not.toHaveBeenCalled();
  expect(alert).toHaveBeenCalledWith(strings.transfer.sendIdTitle, strings.transfer.sendIdBody, expect.any(Array));
  alert.mockRestore();
});

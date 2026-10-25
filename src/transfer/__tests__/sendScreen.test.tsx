import { act, render, screen } from '@testing-library/react-native';
import { makeCard } from '../../../test/fixtures';
import SendCard from '../../../app/send/[id]';
import { TRANSFER_FPS } from '../../config';
import { createTransfer } from '../frames';

jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({ id: 'card1' }), useRouter: () => ({ back: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('expo-keep-awake', () => ({ useKeepAwake: () => {} }));
jest.mock('../../hooks/useMaxBrightness', () => ({ useMaxBrightness: () => {} }));
const mockTransfer = createTransfer(new Uint8Array(5000).fill(3), 9);
jest.mock('../sendCard', () => ({ prepareTransfer: async () => mockTransfer }));
const mockCards = [makeCard({ id: 'card1', name: 'Gym' })];
const mockServices = { store: {} };
jest.mock('../../app/AppProvider', () => ({ useApp: () => ({ cards: mockCards, services: mockServices }) }));
const mockQr = jest.fn();
jest.mock('../../ui/QrCode', () => ({ QrCode: ({ text }: { text: string }) => (mockQr(text), null) }));

test('plays a changing stream of codes once the card is ready', async () => {
  jest.useFakeTimers();
  try {
    await render(<SendCard />);
    await act(async () => {});
    expect(screen.getByTestId('send-qr')).toBeTruthy();
    expect(mockQr).toHaveBeenLastCalledWith(mockTransfer.frame(0));
    await act(async () => jest.advanceTimersByTime(1000 / TRANSFER_FPS));
    expect(mockQr).toHaveBeenLastCalledWith(mockTransfer.frame(1));
  } finally {
    jest.useRealTimers();
  }
});

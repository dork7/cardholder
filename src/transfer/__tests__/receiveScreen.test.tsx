import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { base64, utf8 } from '../../crypto/bytes';
import ReceiveCard from '../../../app/receive';
import { strings } from '../../strings';
import { encodeCardMessage } from '../cardMessage';
import { createTransfer } from '../frames';

const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace, back: mockBack }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
let mockGranted = true;
const mockRequest = jest.fn();
let mockOnScanned: (e: { data: string }) => void = () => {};
jest.mock('expo-camera', () => ({
  useCameraPermissions: () => [{ granted: mockGranted, canAskAgain: true }, mockRequest],
  CameraView: (props: { onBarcodeScanned: (e: { data: string }) => void }) => {
    mockOnScanned = props.onBarcodeScanned;
    return null;
  },
}));
jest.mock('../images', () => ({
  withThumbnail: async (front: { jpegBase64: string; aspect: number }) => ({ ...front, thumbJpegBase64: 'thumb' }),
}));
jest.mock('../../reminders/scheduler', () => ({ requestReminderPermissionOnce: async () => true }));
const mockCreate = jest.fn(async (fields: object) => ({ id: 'new1', ...fields }));
const mockRefresh = jest.fn(async () => {});
jest.mock('../../app/AppProvider', () => ({
  useApp: () => ({ services: { store: { create: mockCreate } }, cards: [], unlocked: false, refresh: mockRefresh }),
}));

const jpeg = (marker: string) => base64.encode(new Uint8Array([0xff, 0xd8, 0xff, ...utf8.encode(marker.repeat(400))]));
const transfer = createTransfer(
  encodeCardMessage({
    fields: { name: 'Gym', category: 'membership', expiresOn: null, tags: ['Fitness'], documentKey: null },
    front: { jpegBase64: jpeg('front'), aspect: 1.586 },
    back: null,
  }),
  7,
);

beforeEach(() => {
  jest.clearAllMocks();
  mockGranted = true;
});

test('reads the codes, shows progress, saves the card and opens it', async () => {
  await render(<ReceiveCard />);
  expect(screen.getByTestId('receive-status').props.children).toBe(strings.transfer.waiting);
  await act(async () => mockOnScanned({ data: transfer.frame(0) }));
  expect(screen.getByTestId('receive-status').props.children).toMatch(/^Receiving… \d+%$/);
  await act(async () => {
    for (let seq = 1; seq < transfer.k; seq++) mockOnScanned({ data: transfer.frame(seq) });
  });
  expect(mockCreate).toHaveBeenCalledWith(
    expect.objectContaining({ name: 'Gym', tags: ['Fitness'], folderId: null }),
    expect.objectContaining({ back: null }),
  );
  expect(mockRefresh).toHaveBeenCalled();
  expect(mockReplace).toHaveBeenCalledWith('/card/new1');
});

test('codes from anything else are ignored', async () => {
  await render(<ReceiveCard />);
  await act(async () => mockOnScanned({ data: 'https://example.com' }));
  expect(screen.getByTestId('receive-status').props.children).toBe(strings.transfer.waiting);
});

test('without camera access it explains why and asks', async () => {
  mockGranted = false;
  await render(<ReceiveCard />);
  expect(screen.getByText(strings.transfer.cameraNeeded)).toBeTruthy();
  await fireEvent.press(screen.getByTestId('allow-camera'));
  expect(mockRequest).toHaveBeenCalled();
});

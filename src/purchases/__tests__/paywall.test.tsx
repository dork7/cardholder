import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { Purchase } from 'expo-iap';
import PaywallScreen from '../../../app/paywall';
import { UNLOCK_PRODUCT_ID } from '../../config';
import { strings } from '../../strings';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack }) }));
const mockValues = new Map<string, string>();
const mockSettings = {
  set: jest.fn(async (key: string, value: string) => { mockValues.set(key, value); }),
};
const mockRefresh = jest.fn(async () => {});
jest.mock('../../app/AppProvider', () => ({
  useApp: () => ({ services: { settings: mockSettings }, unlocked: false, refresh: mockRefresh }),
}));
let mockOnPurchase: (purchase: Purchase) => void;
const mockInit = jest.fn(async () => true);
const mockFetch = jest.fn(async () => [{ id: UNLOCK_PRODUCT_ID, type: 'in-app', displayPrice: 'AED 10.99' }]);
const mockRequest = jest.fn(async () => null);
const mockAvailable = jest.fn(async (): Promise<Purchase[]> => []);
const mockFinish = jest.fn(async () => {});
jest.mock('expo-iap', () => ({
  initConnection: () => mockInit(),
  endConnection: async () => true,
  fetchProducts: () => mockFetch(),
  requestPurchase: () => mockRequest(),
  getAvailablePurchases: () => mockAvailable(),
  finishTransaction: () => mockFinish(),
  syncIOS: async () => true,
  isTransactionVerifiedIOS: async () => true,
  purchaseUpdatedListener: (listener: typeof mockOnPurchase) => {
    mockOnPurchase = listener;
    return { remove: () => {} };
  },
  purchaseErrorListener: () => ({ remove: () => {} }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockValues.clear();
});

test('paywall contacts the store only after a tap and unlocks on a completed purchase', async () => {
  await render(<PaywallScreen />);
  expect(screen.getByText(strings.paywall.body(10))).toBeTruthy();
  expect(mockInit).not.toHaveBeenCalled();
  await act(async () => fireEvent.press(screen.getByTestId('purchase-price')));
  expect(screen.getByText('Unlock for AED 10.99')).toBeTruthy();
  await act(async () => fireEvent.press(screen.getByTestId('buy-unlimited')));
  expect(mockRequest).toHaveBeenCalledTimes(1);
  expect(mockValues.has('unlocked')).toBe(false);
  await act(async () => mockOnPurchase({
    id: 'order', productId: UNLOCK_PRODUCT_ID, purchaseToken: 'token', purchaseState: 'purchased',
    quantity: 1, transactionDate: 123, store: 'google', storeId: 'play', isAutoRenewing: false,
  }));
  expect(mockValues.get('unlocked')).toBe('1');
  expect(mockFinish).toHaveBeenCalledTimes(1);
  expect(mockRefresh).toHaveBeenCalledTimes(1);
  expect(screen.queryByTestId('buy-unlimited')).toBeNull();
  expect(screen.getByText(strings.settings.unlocked)).toBeTruthy();
  await fireEvent.press(screen.getByTestId('purchase-done'));
  expect(mockBack).toHaveBeenCalledTimes(1);
});

test('Restore is available without loading a price and explains when no purchase exists', async () => {
  await render(<PaywallScreen />);
  await act(async () => fireEvent.press(screen.getByTestId('restore-purchases')));
  expect(mockAvailable).toHaveBeenCalledTimes(1);
  expect(mockFetch).not.toHaveBeenCalled();
  expect(screen.getByText(strings.settings.restoreNone)).toBeTruthy();
  expect(mockValues.has('unlocked')).toBe(false);
});

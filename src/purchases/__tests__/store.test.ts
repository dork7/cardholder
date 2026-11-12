import type { Product, Purchase } from 'expo-iap';
import { UNLOCK_PRODUCT_ID } from '../../config';
import { Settings } from '../../storage/settings';
import { createPurchases, PurchaseStore } from '../store';

type StoreError = Parameters<Parameters<PurchaseStore['purchaseErrorListener']>[0]>[0];

const purchase = (patch: Partial<Purchase> = {}): Purchase => ({
  id: 'order-1', productId: UNLOCK_PRODUCT_ID, purchaseToken: 'token-1',
  purchaseState: 'purchased', quantity: 1, transactionDate: 123,
  store: 'google', storeId: 'play', isAutoRenewing: false, isAcknowledgedAndroid: false,
  ...patch,
});
const product: Product = {
  id: UNLOCK_PRODUCT_ID, type: 'in-app', platform: 'android', displayPrice: 'AED 10.99',
  currency: 'AED', description: 'Unlimited documents', title: 'Unlimited', nameAndroid: 'Unlimited',
};
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

function setup() {
  const values = new Map<string, string>();
  const settings: Settings = {
    get: async (key) => values.get(key) ?? null,
    getNumber: async () => null,
    set: jest.fn(async (key, value) => { values.set(key, value); }),
    remove: async (key) => { values.delete(key); },
  };
  let onPurchase: (value: Purchase) => void = () => {};
  let onError: (value: StoreError) => void = () => {};
  const removePurchase = jest.fn();
  const removeError = jest.fn();
  const api = {
    initConnection: jest.fn(async (): Promise<boolean> => true),
    endConnection: jest.fn(async () => true),
    fetchProducts: jest.fn(async () => [product]),
    requestPurchase: jest.fn(async () => null),
    getAvailablePurchases: jest.fn(async (): Promise<Purchase[]> => []),
    finishTransaction: jest.fn(async () => undefined),
    syncIOS: jest.fn(async () => true),
    isTransactionVerifiedIOS: jest.fn(async (): Promise<boolean> => true),
    purchaseUpdatedListener: jest.fn((listener: typeof onPurchase) => {
      onPurchase = listener;
      return { remove: removePurchase };
    }),
    purchaseErrorListener: jest.fn((listener: typeof onError) => {
      onError = listener;
      return { remove: removeError };
    }),
  } satisfies PurchaseStore;
  const loadStore = jest.fn(async () => api);
  const refresh = jest.fn(async () => {});
  const controller = createPurchases({ settings, refresh, loadStore });
  return {
    controller, api, settings, values, loadStore, refresh, removePurchase, removeError,
    emit: (value = purchase()) => onPurchase(value),
    error: () => onError({ message: 'store error', name: 'PurchaseError' }),
  };
}

test('opening and closing the paywall never contacts the store', async () => {
  const s = setup();
  expect(s.controller.getSnapshot().price).toBeNull();
  await s.controller.dispose();
  expect(s.loadStore).not.toHaveBeenCalled();
});

test('shows the localized store price, then purchases a permanent product', async () => {
  const s = setup();
  await s.controller.price();
  expect(s.controller.getSnapshot().price).toBe('AED 10.99');
  await s.controller.buy();
  expect(s.api.requestPurchase).toHaveBeenCalledWith({
    type: 'in-app', request: {
      google: { skus: [UNLOCK_PRODUCT_ID] },
      apple: { sku: UNLOCK_PRODUCT_ID, andDangerouslyFinishTransactionAutomatically: false },
    },
  });
  expect(s.settings.set).not.toHaveBeenCalled(); // launch alone is not payment
  s.emit();
  await flush();
  expect(s.values.get('unlocked')).toBe('1');
  expect(s.refresh).toHaveBeenCalledTimes(1);
  expect(s.api.finishTransaction).toHaveBeenCalledWith({ purchase: purchase(), isConsumable: false });
  expect(jest.mocked(s.settings.set).mock.invocationCallOrder[0]).toBeLessThan(s.api.finishTransaction.mock.invocationCallOrder[0]);
  expect(s.controller.getSnapshot()).toMatchObject({ busy: false, message: 'purchased' });
  await s.controller.dispose();
});

test('pending payments stay locked until an approved purchase is restored', async () => {
  const s = setup();
  await s.controller.price();
  await s.controller.buy();
  s.emit(purchase({ purchaseState: 'pending' }));
  await flush();
  expect(s.settings.set).not.toHaveBeenCalled();
  expect(s.api.finishTransaction).not.toHaveBeenCalled();
  expect(s.controller.getSnapshot().message).toBe('pending');
  s.api.getAvailablePurchases.mockResolvedValue([purchase()]);
  await s.controller.restore('android');
  expect(s.values.get('unlocked')).toBe('1');
  expect(s.api.syncIOS).not.toHaveBeenCalled();
  await s.controller.dispose();
});

test('restoration without a purchase or with another product grants nothing', async () => {
  const s = setup();
  s.api.getAvailablePurchases.mockResolvedValue([purchase({ productId: 'other' })]);
  await s.controller.restore('android');
  expect(s.controller.getSnapshot().message).toBe('none');
  expect(s.settings.set).not.toHaveBeenCalled();
  expect(s.api.finishTransaction).not.toHaveBeenCalled();
  await s.controller.dispose();
});

test('already-owned response restores instead of trying to charge again', async () => {
  const s = setup();
  await s.controller.price();
  s.api.requestPurchase.mockRejectedValueOnce({ code: 'already-owned' });
  s.api.getAvailablePurchases.mockResolvedValue([purchase({ isAcknowledgedAndroid: true })]);
  await s.controller.buy();
  expect(s.values.get('unlocked')).toBe('1');
  expect(s.api.finishTransaction).not.toHaveBeenCalled();
  expect(s.controller.getSnapshot().message).toBe('purchased');
  await s.controller.dispose();
});

test('duplicate simultaneous events save and acknowledge once', async () => {
  const s = setup();
  await s.controller.price();
  s.emit();
  s.emit();
  await flush();
  expect(s.settings.set).toHaveBeenCalledTimes(1);
  expect(s.api.finishTransaction).toHaveBeenCalledTimes(1);
  await s.controller.dispose();
});

test('a failed local save leaves the store purchase unfinished for recovery', async () => {
  const s = setup();
  jest.mocked(s.settings.set).mockRejectedValueOnce(new Error('disk full'));
  await s.controller.price();
  s.emit();
  await flush();
  expect(s.api.finishTransaction).not.toHaveBeenCalled();
  expect(s.controller.getSnapshot().message).toBe('failed');
  s.api.getAvailablePurchases.mockResolvedValue([purchase()]);
  await s.controller.restore('android');
  expect(s.values.get('unlocked')).toBe('1');
  await s.controller.dispose();
});

test('failed acknowledgement can be retried with Restore', async () => {
  const s = setup();
  s.api.finishTransaction.mockRejectedValueOnce(new Error('offline'));
  await s.controller.price();
  s.emit();
  await flush();
  expect(s.values.get('unlocked')).toBe('1');
  expect(s.controller.getSnapshot().message).toBe('finishing-failed');
  s.api.getAvailablePurchases.mockResolvedValue([purchase()]);
  await s.controller.restore('android');
  expect(s.api.finishTransaction).toHaveBeenCalledTimes(2);
  expect(s.controller.getSnapshot().message).toBe('purchased');
  await s.controller.dispose();
});

test('cancelled purchases stay locked and allow another attempt', async () => {
  const s = setup();
  await s.controller.price();
  s.api.requestPurchase.mockRejectedValueOnce({ code: 'user-cancelled' });
  await s.controller.buy();
  expect(s.controller.getSnapshot()).toMatchObject({ busy: false, message: null });
  expect(s.settings.set).not.toHaveBeenCalled();
  await s.controller.buy();
  expect(s.api.requestPurchase).toHaveBeenCalledTimes(2);
  await s.controller.dispose();
});

test('an unavailable store can be retried and closing removes listeners', async () => {
  const s = setup();
  s.api.initConnection.mockRejectedValueOnce(new Error('unavailable'));
  await s.controller.price();
  expect(s.controller.getSnapshot()).toMatchObject({ busy: false, message: 'unavailable', price: null });
  await s.controller.price();
  expect(s.controller.getSnapshot().price).toBe('AED 10.99');
  await s.controller.dispose();
  expect(s.removePurchase).toHaveBeenCalledTimes(2);
  expect(s.removeError).toHaveBeenCalledTimes(2);
  expect(s.api.endConnection).toHaveBeenCalledTimes(2);
});

test('iOS restores sync and verify with StoreKit before unlocking', async () => {
  const s = setup();
  s.api.getAvailablePurchases.mockResolvedValue([purchase({ store: 'apple', storeId: 'apple' })]);
  s.api.isTransactionVerifiedIOS.mockResolvedValueOnce(false);
  await s.controller.restore('ios');
  expect(s.api.syncIOS).toHaveBeenCalledTimes(1);
  expect(s.settings.set).not.toHaveBeenCalled();
  expect(s.controller.getSnapshot().message).toBe('failed');
  await s.controller.restore('ios');
  expect(s.values.get('unlocked')).toBe('1');
  await s.controller.dispose();
});

test('no matching store product leaves Buy unavailable', async () => {
  const s = setup();
  s.api.fetchProducts.mockResolvedValue([]);
  await s.controller.price();
  await s.controller.buy();
  expect(s.controller.getSnapshot()).toMatchObject({ price: null, message: 'price-unavailable', busy: false });
  expect(s.api.requestPurchase).not.toHaveBeenCalled();
  await s.controller.dispose();
});

test('double taps launch only one payment sheet; error events release the controls', async () => {
  const s = setup();
  await s.controller.price();
  await Promise.all([s.controller.buy(), s.controller.buy()]);
  expect(s.api.requestPurchase).toHaveBeenCalledTimes(1);
  s.error();
  await flush();
  expect(s.controller.getSnapshot()).toMatchObject({ busy: false, message: 'failed' });
  expect(s.values.has('unlocked')).toBe(false);
  await s.controller.dispose();
});

test('closing while initialization is pending does not launch a late purchase or product fetch', async () => {
  const s = setup();
  let connected: (value: boolean) => void = () => {};
  s.api.initConnection.mockImplementationOnce(() => new Promise((resolve) => { connected = resolve; }));
  const loading = s.controller.price();
  await flush();
  const closing = s.controller.dispose();
  connected(true);
  await Promise.all([loading, closing]);
  expect(s.api.fetchProducts).not.toHaveBeenCalled();
  expect(s.api.requestPurchase).not.toHaveBeenCalled();
  expect(s.removePurchase).toHaveBeenCalledTimes(1);
});

import type { Purchase } from 'expo-iap';
import { UNLOCK_PRODUCT_ID } from '../config';
import { Settings } from '../storage/settings';
import { markUnlocked } from './entitlement';

// Loaded only after a tap. Importing this module or opening Settings never connects to the store.
export type PurchaseStore = Pick<typeof import('expo-iap'),
  | 'initConnection' | 'endConnection' | 'fetchProducts' | 'requestPurchase'
  | 'getAvailablePurchases' | 'finishTransaction' | 'purchaseUpdatedListener'
  | 'purchaseErrorListener' | 'syncIOS' | 'isTransactionVerifiedIOS'>;

export type PurchaseMessage = 'none' | 'pending' | 'failed' | 'price-unavailable' | 'unavailable' | 'purchased' | 'finishing-failed';
export interface PurchaseState {
  busy: boolean;
  price: string | null;
  message: PurchaseMessage | null;
}

export function createPurchases({ settings, refresh, loadStore }: {
  settings: Settings;
  refresh: () => Promise<void>;
  loadStore: () => Promise<PurchaseStore>;
}) {
  let state: PurchaseState = { busy: false, price: null, message: null };
  const listeners = new Set<() => void>();
  let store: PurchaseStore | null = null;
  let connection: Promise<PurchaseStore> | null = null;
  let subscriptions: { remove(): void }[] = [];
  let closed = false;
  let granted = false;
  const handling = new Map<string, Promise<void>>();

  const update = (patch: Partial<PurchaseState>) => {
    state = { ...state, ...patch };
    if (!closed) listeners.forEach((listener) => listener());
  };
  const errorCode = (error: unknown) =>
    typeof error === 'object' && error !== null && 'code' in error ? error.code : null;

  const complete = async (purchase: Purchase, api: PurchaseStore) => {
    // Pending/unknown purchases must never grant access or be acknowledged.
    if (purchase.productId !== UNLOCK_PRODUCT_ID) return;
    if (purchase.purchaseState === 'pending') {
      update({ busy: false, message: 'pending' });
      return;
    }
    if (purchase.purchaseState !== 'purchased' || !purchase.purchaseToken) {
      update({ busy: false, message: 'failed' });
      return;
    }
    if (purchase.storeId !== 'apple' && purchase.storeId !== 'play') throw new Error('Unexpected store');
    if (purchase.storeId === 'apple' && (
      ('revocationDateIOS' in purchase && purchase.revocationDateIOS != null) ||
      !(await api.isTransactionVerifiedIOS(UNLOCK_PRODUCT_ID))
    )) {
      throw new Error('The store could not verify the purchase');
    }
    // The native billing client supplies Android ownership. There is no receipt server (ADR 0005).
    // Persist before finishing: a storage failure must leave the purchase recoverable through Restore.
    await markUnlocked(settings);
    granted = true;
    await refresh().catch(() => console.warn('Refreshing the purchase unlock failed'));
    try {
      if (!('isAcknowledgedAndroid' in purchase && purchase.isAcknowledgedAndroid)) {
        await api.finishTransaction({ purchase, isConsumable: false });
      }
      update({ busy: false, message: 'purchased' });
    } catch {
      update({ busy: false, message: 'finishing-failed' });
    }
  };

  const handle = (purchase: Purchase, api: PurchaseStore): Promise<void> => {
    const key = purchase.purchaseToken ?? purchase.id;
    const existing = handling.get(key);
    if (existing) return existing;
    const task = complete(purchase, api).finally(() => handling.delete(key));
    handling.set(key, task);
    return task;
  };

  const connect = (): Promise<PurchaseStore> => {
    if (connection) return connection;
    connection = (async () => {
      const api = await loadStore();
      if (closed) throw new Error('Purchase screen closed');
      store = api;
      subscriptions = [
        api.purchaseUpdatedListener((purchase) => {
          void handle(purchase, api).catch(() => update({ busy: false, message: 'failed' }));
        }),
        api.purchaseErrorListener((error) => { void failed(error); }),
      ];
      if (!(await api.initConnection())) throw new Error('Store unavailable');
      if (closed) throw new Error('Purchase screen closed');
      return api;
    })().catch(async (error: unknown) => {
      subscriptions.forEach((subscription) => subscription.remove());
      subscriptions = [];
      await store?.endConnection().catch(() => {});
      store = null;
      connection = null;
      throw error;
    });
    return connection;
  };

  const restoreOwned = async (api: PurchaseStore, sync: boolean) => {
    if (sync && !(await api.syncIOS())) throw new Error('Store sync failed');
    const purchases = await api.getAvailablePurchases({ onlyIncludeActiveItemsIOS: true });
    for (const purchase of purchases) await handle(purchase, api);
    await Promise.all(handling.values());
    if (!granted && state.message === null) update({ message: 'none' });
    update({ busy: false });
  };

  const failed = async (error: unknown) => {
    const code = errorCode(error);
    if (code === 'already-owned' && store && !closed) {
      try {
        await restoreOwned(store, false);
        return;
      } catch { /* Restore can be retried by the user. */ }
    }
    update({ busy: false, message: code === 'user-cancelled' ? null
      : code === 'pending' || code === 'deferred-payment' ? 'pending' : 'failed' });
  };

  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    async price() {
      if (closed || state.busy) return;
      update({ busy: true, message: null });
      try {
        const api = await connect();
        const products = await api.fetchProducts({ skus: [UNLOCK_PRODUCT_ID], type: 'in-app' });
        if (closed) return;
        const product = products?.find((product) => product.id === UNLOCK_PRODUCT_ID && product.type === 'in-app');
        update({ price: product?.displayPrice || null, message: product?.displayPrice ? null : 'price-unavailable' });
      } catch {
        update({ message: 'unavailable' });
      } finally {
        update({ busy: false });
      }
    },
    async buy() {
      if (closed || state.busy || !state.price || granted) return;
      update({ busy: true, message: null });
      try {
        const api = await connect();
        if (closed) return;
        // Results arrive through the listener, not requestPurchase's promise.
        await api.requestPurchase({
          type: 'in-app',
          request: {
            google: { skus: [UNLOCK_PRODUCT_ID] },
            apple: { sku: UNLOCK_PRODUCT_ID, andDangerouslyFinishTransactionAutomatically: false },
          },
        });
      } catch (error) {
        await failed(error);
      }
    },
    async restore(platform: string) {
      if (closed || state.busy) return;
      update({ busy: true, message: null });
      try {
        const api = await connect();
        if (!closed) await restoreOwned(api, platform === 'ios');
      } catch {
        update({ busy: false, message: 'failed' });
      }
    },
    async dispose() {
      closed = true;
      listeners.clear();
      subscriptions.forEach((subscription) => subscription.remove());
      subscriptions = [];
      // Finish an event already being saved before disconnecting. If the screen closes before a
      // delayed payment arrives, Restore recovers it on the next visit.
      await connection?.catch(() => {});
      await Promise.allSettled(handling.values());
      await store?.endConnection().catch(() => {});
    },
  };
}

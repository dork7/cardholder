import * as SecureStore from 'expo-secure-store';
import { base64 } from './bytes';
import { KeyVault } from './keyring';

const KEY_NAME = 'cardholder.dataKey.v1';
// THIS_DEVICE_ONLY: never synced to iCloud Keychain, never restored onto another phone.
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

export const secureVault: KeyVault = {
  async get() {
    const value = await SecureStore.getItemAsync(KEY_NAME, OPTIONS);
    return value ? base64.decode(value) : null;
  },
  async set(key) {
    await SecureStore.setItemAsync(KEY_NAME, base64.encode(key), OPTIONS);
  },
};

import { BlobStore } from '../storage/blobStore';
import { Settings } from '../storage/settings';
import { SqlDb } from '../storage/sqlDb';
import { Aead, createAead, generateKey } from './aead';
import { base64, utf8 } from './bytes';

export interface KeyVault {
  get(): Promise<Uint8Array | null>;
  set(key: Uint8Array): Promise<void>;
}

export type KeyringResult = { status: 'ready'; aead: Aead } | { status: 'orphaned' };

const KEY_CHECK_PLAINTEXT = 'cardholder-key-check-v1';

export async function openKeyring(vault: KeyVault, settings: Settings): Promise<KeyringResult> {
  const check = await settings.get('keyCheck');
  let key = await vault.get();

  if (check === null) {
    if (!key) {
      key = generateKey();
      await vault.set(key);
    }
    const aead = createAead(key);
    await settings.set('keyCheck', base64.encode(aead.seal(utf8.encode(KEY_CHECK_PLAINTEXT))));
    return { status: 'ready', aead };
  }

  if (!key) return { status: 'orphaned' };
  try {
    const aead = createAead(key);
    if (utf8.decode(aead.open(base64.decode(check))) === KEY_CHECK_PLAINTEXT) return { status: 'ready', aead };
  } catch {
    // Wrong or corrupt key: fall through to orphaned.
  }
  return { status: 'orphaned' };
}

export async function startFresh(deps: {
  db: SqlDb;
  blobs: BlobStore;
  vault: KeyVault;
  settings: Settings;
}): Promise<Aead> {
  const { db, blobs, vault, settings } = deps;
  await db.execAsync('DELETE FROM cards; DELETE FROM settings;');
  for (const name of await blobs.list()) await blobs.remove(name);
  await vault.set(generateKey());
  const result = await openKeyring(vault, settings);
  if (result.status !== 'ready') throw new Error('Fresh keyring did not open');
  return result.aead;
}

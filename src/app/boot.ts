import { CardStore, createCardStore } from '../cards/cardStore';
import { KeyVault, openKeyring, startFresh } from '../crypto/keyring';
import { BlobStore } from '../storage/blobStore';
import { createSettings, Settings } from '../storage/settings';
import { migrate, SqlDb } from '../storage/sqlDb';

export interface BootDeps {
  db: SqlDb;
  blobs: BlobStore;
  vault: KeyVault;
}

export interface Services extends BootDeps {
  settings: Settings;
  store: CardStore;
}

export type BootResult = { status: 'ready'; services: Services } | { status: 'orphaned' };

export async function boot(deps: BootDeps): Promise<BootResult> {
  await migrate(deps.db);
  const settings = createSettings(deps.db);
  const keyring = await openKeyring(deps.vault, settings);
  if (keyring.status === 'orphaned') return { status: 'orphaned' };
  const store = createCardStore({ db: deps.db, blobs: deps.blobs, aead: keyring.aead });
  return { status: 'ready', services: { ...deps, settings, store } };
}

export async function bootFresh(deps: BootDeps): Promise<Services> {
  await migrate(deps.db);
  const settings = createSettings(deps.db);
  const aead = await startFresh({ ...deps, settings });
  return { ...deps, settings, store: createCardStore({ db: deps.db, blobs: deps.blobs, aead }) };
}

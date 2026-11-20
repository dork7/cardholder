import { createNoteEditors, NoteEditors } from '../notes/noteEditors';
import { createNoteStore, NoteStore } from '../notes/noteStore';
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
  notes: NoteStore;
  noteEditors: NoteEditors;
}

export type BootResult = { status: 'ready'; services: Services } | { status: 'orphaned' };

export async function boot(deps: BootDeps): Promise<BootResult> {
  await migrate(deps.db);
  const settings = createSettings(deps.db);
  const keyring = await openKeyring(deps.vault, settings);
  if (keyring.status === 'orphaned') return { status: 'orphaned' };
  const store = createCardStore({ db: deps.db, blobs: deps.blobs, aead: keyring.aead });
  await store.migrateFoldersToTags();
  const notes = createNoteStore({ db: deps.db, aead: keyring.aead });
  return { status: 'ready', services: { ...deps, settings, store, notes, noteEditors: createNoteEditors(notes) } };
}

export async function bootFresh(deps: BootDeps): Promise<Services> {
  await migrate(deps.db);
  const settings = createSettings(deps.db);
  const aead = await startFresh({ ...deps, settings });
  const notes = createNoteStore({ db: deps.db, aead });
  return { ...deps, settings, store: createCardStore({ db: deps.db, blobs: deps.blobs, aead }), notes, noteEditors: createNoteEditors(notes) };
}

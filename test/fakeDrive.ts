import { DriveClient, DriveError, DriveFile } from '../src/backup/drive/driveApi';
import { AuthResult, GoogleAuth } from '../src/backup/drive/googleAuth';

// An in-memory Drive with only what this app's drive.file access would see.
export function fakeDrive() {
  const folders = new Map<string, { name: string; trashed: boolean }>();
  const files = new Map<string, DriveFile & { parent: string; bytes: Uint8Array }>();
  let next = 1;
  let created = 0;
  const failures: { upload?: DriveError } = {};
  const client: DriveClient = {
    userEmail: jest.fn(async () => 'someone@example.com'),
    findFolder: jest.fn(async (name: string) => [...folders].find(([, f]) => f.name === name && !f.trashed)?.[0] ?? null),
    createFolder: jest.fn(async (name: string) => { const id = `folder${next++}`; folders.set(id, { name, trashed: false }); return id; }),
    folderExists: jest.fn(async (id: string) => folders.has(id) && !folders.get(id)!.trashed),
    upload: jest.fn(async (folderId: string, name: string, bytes: Uint8Array) => {
      if (failures.upload) throw failures.upload;
      const id = `file${next++}`;
      files.set(id, { id, name, size: bytes.byteLength, createdTime: new Date(created++).toISOString(), parent: folderId, bytes });
      return id;
    }),
    list: jest.fn(async (folderId: string) => [...files.values()].filter((f) => f.parent === folderId).reverse()),
    download: jest.fn(async (id: string) => { const f = files.get(id); if (!f) throw new DriveError('not-found'); return f.bytes; }),
    remove: jest.fn(async (id: string) => { files.delete(id); folders.delete(id); }),
    revoke: jest.fn(async () => {}),
  };
  return { client, folders, files, failures, inFolder: (id: string) => [...files.values()].filter((f) => f.parent === id) };
}

export function fakeAuth(results: AuthResult[] = []) {
  let wifi = true;
  const auth: GoogleAuth & { authorize: jest.Mock } = {
    isAvailable: () => true,
    isOnUnmeteredNetwork: () => wifi,
    authorize: jest.fn(async (_interactive: boolean): Promise<AuthResult> => results.shift() ?? { status: 'ok', accessToken: 'token' }),
    clearToken: jest.fn(async () => {}),
  };
  return { auth, setWifi: (value: boolean) => { wifi = value; } };
}

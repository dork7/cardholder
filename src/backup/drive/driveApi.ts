// Google Drive REST v3, just what Drive backup needs (ADR-0010). Plain requests with a bearer token:
// no Drive SDK. With the drive.file scope Drive only shows this app the files and folders it created.

const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
const FOLDER_MIME = 'application/vnd.google-apps.folder';
// Resumable upload chunks must be multiples of 256 KiB.
export const CHUNK_SIZE = 32 * 256 * 1024; // 8 MiB
const MAX_RESUMES = 3;

export type DriveErrorKind =
  | 'auth' // the token was refused, or access was removed: reconnect
  | 'quota' // the user's Drive is full
  | 'not-found'
  | 'network' // no connection, or Drive is busy (5xx, rate limits)
  | 'cancelled' // the user closed the account chooser
  | 'unavailable' // no Play services
  | 'other';

export class DriveError extends Error {
  constructor(readonly kind: DriveErrorKind, message?: string) {
    super(message ?? `Drive ${kind}`);
    this.name = 'DriveError';
  }
}

export interface DriveFile {
  id: string;
  name: string;
  size: number;
  createdTime: string; // RFC 3339
}

export interface DriveClient {
  userEmail(): Promise<string>;
  findFolder(name: string): Promise<string | null>;
  createFolder(name: string): Promise<string>;
  folderExists(id: string): Promise<boolean>;
  upload(folderId: string, name: string, bytes: Uint8Array): Promise<string>;
  list(folderId: string): Promise<DriveFile[]>;
  download(id: string): Promise<Uint8Array>;
  remove(id: string): Promise<void>;
  revoke(): Promise<void>;
}

interface Transport {
  fetch: (url: string, init?: RequestInit) => Promise<Response>;
  // Large downloads go through the file system rather than JS memory-heavy response bodies.
  download: (url: string, headers: Record<string, string>) => Promise<Uint8Array>;
  // fresh: the previous token was refused; drop it and fetch another.
  token: (fresh: boolean) => Promise<string>;
  chunkSize?: number;
}

async function errorFor(response: Response): Promise<DriveError> {
  const { status } = response;
  if (status === 401) return new DriveError('auth');
  if (status === 404) return new DriveError('not-found');
  if (status === 429 || status >= 500) return new DriveError('network', `Drive ${status}`);
  let reason = '';
  try {
    const body = await response.json();
    reason = body?.error?.errors?.[0]?.reason ?? body?.error?.status ?? '';
  } catch {
    // Not JSON.
  }
  if (status === 403 && /storageQuotaExceeded|quotaExceeded/i.test(reason)) return new DriveError('quota');
  if (status === 403 && /rateLimit/i.test(reason)) return new DriveError('network', reason);
  return new DriveError('other', `Drive ${status} ${reason}`.trim());
}

const quote = (value: string) => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

export function createDriveClient(transport: Transport): DriveClient {
  const chunkSize = transport.chunkSize ?? CHUNK_SIZE;
  let token: string | null = null;

  // One retry with a fresh token after a 401; network failures become DriveError('network').
  async function request(url: string, init: RequestInit = {}, okStatuses: number[] = []): Promise<Response> {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (!token || attempt > 0) token = await transport.token(attempt > 0);
      let response: Response;
      try {
        response = await transport.fetch(url, { ...init, headers: { ...(init.headers as object), Authorization: `Bearer ${token}` } });
      } catch {
        throw new DriveError('network');
      }
      if (response.ok || okStatuses.includes(response.status)) return response;
      if (response.status === 401 && attempt === 0) continue;
      throw await errorFor(response);
    }
    throw new DriveError('auth');
  }
  const json = async <T>(url: string, init?: RequestInit): Promise<T> => (await request(url, init)).json() as Promise<T>;

  // Where a resumable session stands: the next byte to send, or the finished file's id.
  async function sessionStatus(session: string, total: number): Promise<{ next: number } | { id: string }> {
    const response = await request(session, { method: 'PUT', headers: { 'Content-Range': `bytes */${total}` } }, [308]);
    if (response.status !== 308) return { id: (await response.json()).id };
    const range = response.headers.get('Range'); // "bytes=0-1234"
    return { next: range ? Number(range.split('-')[1]) + 1 : 0 };
  }

  return {
    async userEmail() {
      const body = await json<{ user?: { emailAddress?: string } }>(`${API}/about?fields=user(emailAddress)`);
      return body.user?.emailAddress ?? '';
    },
    async findFolder(name) {
      const q = `mimeType='${FOLDER_MIME}' and name=${quote(name)} and trashed=false`;
      const body = await json<{ files: { id: string }[] }>(
        `${API}/files?q=${encodeURIComponent(q)}&spaces=drive&fields=files(id)&orderBy=createdTime&pageSize=10`);
      return body.files[0]?.id ?? null;
    },
    async createFolder(name) {
      const body = await json<{ id: string }>(`${API}/files?fields=id`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, mimeType: FOLDER_MIME }),
      });
      return body.id;
    },
    async folderExists(id) {
      try {
        const body = await json<{ trashed?: boolean }>(`${API}/files/${encodeURIComponent(id)}?fields=id,trashed`);
        return !body.trashed;
      } catch (error) {
        if (error instanceof DriveError && error.kind === 'not-found') return false;
        throw error;
      }
    },
    async upload(folderId, name, bytes) {
      const total = bytes.byteLength;
      const start = await request(`${UPLOAD}?uploadType=resumable&fields=id`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': 'application/octet-stream',
          'X-Upload-Content-Length': String(total),
        },
        body: JSON.stringify({ name, parents: [folderId], mimeType: 'application/octet-stream' }),
      });
      const session = start.headers.get('Location');
      if (!session) throw new DriveError('other', 'Drive gave no upload session');

      let offset = 0;
      let resumes = 0;
      for (;;) {
        const end = Math.min(offset + chunkSize, total);
        try {
          const response = await request(session, {
            method: 'PUT',
            headers: { 'Content-Range': total === 0 ? 'bytes */0' : `bytes ${offset}-${end - 1}/${total}` },
            body: bytes.subarray(offset, end) as unknown as BodyInit,
          }, [308]);
          if (response.status !== 308) return (await response.json()).id;
          const range = response.headers.get('Range');
          offset = range ? Number(range.split('-')[1]) + 1 : 0;
        } catch (error) {
          // A dropped connection or a busy server: ask Drive how much arrived and carry on from there.
          if (!(error instanceof DriveError) || error.kind !== 'network' || resumes >= MAX_RESUMES) throw error;
          resumes++;
          const status = await sessionStatus(session, total);
          if ('id' in status) return status.id;
          offset = status.next;
        }
      }
    },
    async list(folderId) {
      const q = `${quote(folderId)} in parents and trashed=false`;
      const body = await json<{ files: { id: string; name: string; size?: string; createdTime: string }[] }>(
        `${API}/files?q=${encodeURIComponent(q)}&spaces=drive&fields=files(id,name,size,createdTime)&orderBy=createdTime desc&pageSize=100`);
      return body.files.map((f) => ({ id: f.id, name: f.name, size: Number(f.size ?? 0), createdTime: f.createdTime }));
    },
    async download(id) {
      if (!token) token = await transport.token(false);
      const url = `${API}/files/${encodeURIComponent(id)}?alt=media`;
      try {
        return await transport.download(url, { Authorization: `Bearer ${token}` });
      } catch {
        token = await transport.token(true);
        try {
          return await transport.download(url, { Authorization: `Bearer ${token}` });
        } catch {
          throw new DriveError('network');
        }
      }
    },
    async remove(id) {
      await request(`${API}/files/${encodeURIComponent(id)}`, { method: 'DELETE' }, [404]);
    },
    async revoke() {
      if (!token) token = await transport.token(false).catch(() => null);
      if (!token) return;
      try {
        await transport.fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
          method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
      } catch {
        // Best effort: the user can also remove access in their Google account.
      }
      token = null;
    },
  };
}

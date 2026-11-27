import { createDriveClient, DriveError } from '../driveApi';

type Handler = (url: string, init: RequestInit) => Response | Promise<Response>;
const res = (status: number, body?: unknown, headers: Record<string, string> = {}) =>
  ({ status, ok: status >= 200 && status < 300, headers: { get: (k: string) => headers[k] ?? null },
    json: async () => body } as unknown as Response);

function client(handler: Handler, chunkSize = 4) {
  const calls: { url: string; init: RequestInit }[] = [];
  const token = jest.fn(async (fresh: boolean) => (fresh ? 'fresh' : 'stale'));
  const drive = createDriveClient({
    fetch: async (url, init = {}) => { calls.push({ url, init }); return handler(url, init); },
    download: async () => new Uint8Array([9]),
    token, chunkSize,
  });
  return { drive, calls, token };
}
const header = (init: RequestInit, name: string) => (init.headers as Record<string, string>)[name];

test('a resumable upload sends the file in chunks and returns its id', async () => {
  const received: number[] = [];
  const { drive, calls } = client((url, init) => {
    if (url.includes('uploadType=resumable')) return res(200, {}, { Location: 'https://session' });
    const body = init.body as Uint8Array;
    received.push(...body);
    const end = received.length - 1;
    return received.length < 10 ? res(308, undefined, { Range: `bytes=0-${end}` }) : res(200, { id: 'new-file' });
  });
  const bytes = Uint8Array.from({ length: 10 }, (_, i) => i);
  expect(await drive.upload('folder', 'a.cardholder', bytes)).toBe('new-file');
  expect(received).toEqual([...bytes]);
  expect(JSON.parse(calls[0].init.body as string)).toEqual({ name: 'a.cardholder', parents: ['folder'], mimeType: 'application/octet-stream' });
  expect(calls.slice(1).map((c) => header(c.init, 'Content-Range'))).toEqual(['bytes 0-3/10', 'bytes 4-7/10', 'bytes 8-9/10']);
  expect(header(calls[1].init, 'Authorization')).toBe('Bearer stale');
});

test('a dropped connection resumes from the last byte Drive acknowledged', async () => {
  let dropped = false;
  const { drive, calls } = client((url, init) => {
    if (url.includes('uploadType=resumable')) return res(200, {}, { Location: 'https://session' });
    const range = header(init, 'Content-Range');
    if (range === 'bytes */8') return res(308, undefined, { Range: 'bytes=0-1' }); // only 2 bytes arrived
    if (range === 'bytes 4-7/8' && !dropped) { dropped = true; throw new TypeError('Network request failed'); }
    if (range === 'bytes 0-3/8') return res(308, undefined, { Range: 'bytes=0-3' });
    if (range === 'bytes 2-5/8') return res(308, undefined, { Range: 'bytes=0-5' });
    return res(201, { id: 'done' });
  });
  expect(await drive.upload('folder', 'a', new Uint8Array(8))).toBe('done');
  expect(calls.map((c) => header(c.init, 'Content-Range')).filter(Boolean))
    .toEqual(['bytes 0-3/8', 'bytes 4-7/8', 'bytes */8', 'bytes 2-5/8', 'bytes 6-7/8']);
});

test('a refused token is replaced once, then reported as needing reconnect', async () => {
  let calls = 0;
  const ok = client(() => (++calls === 1 ? res(401) : res(200, { user: { emailAddress: 'a@b.c' } })));
  expect(await ok.drive.userEmail()).toBe('a@b.c');
  expect(ok.token).toHaveBeenLastCalledWith(true);

  const refused = client(() => res(401));
  await expect(refused.drive.userEmail()).rejects.toMatchObject({ kind: 'auth' });
});

test('errors map to what the user can do about them', async () => {
  const kind = async (response: Response) => {
    const { drive } = client(() => response);
    try { await drive.createFolder('x'); } catch (e) { return (e as DriveError).kind; }
  };
  expect(await kind(res(403, { error: { errors: [{ reason: 'storageQuotaExceeded' }] } }))).toBe('quota');
  expect(await kind(res(403, { error: { errors: [{ reason: 'userRateLimitExceeded' }] } }))).toBe('network');
  expect(await kind(res(503))).toBe('network');
  expect(await kind(res(400, { error: { errors: [{ reason: 'badRequest' }] } }))).toBe('other');
  const offline = client(() => { throw new TypeError('Network request failed'); });
  await expect(offline.drive.userEmail()).rejects.toMatchObject({ kind: 'network' });
});

test('folder lookups escape the name and treat a missing or trashed folder as gone', async () => {
  const { drive, calls } = client((url) => {
    if (url.includes('/files?q=')) return res(200, { files: [{ id: 'f1' }] });
    if (url.includes('/files/gone')) return res(404);
    return res(200, { id: 'trashed', trashed: true });
  });
  expect(await drive.findFolder("Bob's backups")).toBe('f1');
  expect(decodeURIComponent(calls[0].url)).toContain("name='Bob\\'s backups' and trashed=false");
  expect(await drive.folderExists('gone')).toBe(false);
  expect(await drive.folderExists('trashed')).toBe(false);
});

test('deleting a file that is already gone succeeds', async () => {
  const { drive } = client(() => res(404));
  await expect(drive.remove('gone')).resolves.toBeUndefined();
});

import { planShared, setPendingShared, takePendingShared } from '../sharedIn';

const photo = (n: number) => ({ path: `/cache/${n}.jpg`, mimeType: 'image/jpeg' });
const pdf = { path: '/cache/lease.pdf', mimeType: 'application/pdf' };

test('one photo is the front, two are the front and back in the order shared', () => {
  expect(planShared([photo(1)])).toEqual({ kind: 'photos', paths: ['/cache/1.jpg'] });
  expect(planShared([photo(1), photo(2)])).toEqual({ kind: 'photos', paths: ['/cache/1.jpg', '/cache/2.jpg'] });
});

test('one PDF is a PDF document, also when the sending app gives no proper type', () => {
  expect(planShared([pdf])).toEqual({ kind: 'pdf', path: '/cache/lease.pdf' });
  expect(planShared([{ path: '/cache/0.bin', mimeType: 'application/octet-stream', fileName: 'Lease.PDF' }])).toEqual({
    kind: 'pdf',
    path: '/cache/0.bin',
  });
});

test('anything else is refused', () => {
  expect(planShared([])).toBeNull();
  expect(planShared([photo(1), photo(2), photo(3)])).toBeNull();
  expect(planShared([pdf, pdf])).toBeNull();
  expect(planShared([photo(1), pdf])).toBeNull();
  expect(planShared([{ path: '/cache/a.mp4', mimeType: 'video/mp4' }])).toBeNull();
});

test('what was shared is handed over once', () => {
  expect(takePendingShared()).toBeNull();
  setPendingShared({ kind: 'pdf', path: '/cache/lease.pdf' });
  expect(takePendingShared()).toEqual({ kind: 'pdf', path: '/cache/lease.pdf' });
  expect(takePendingShared()).toBeNull();
});

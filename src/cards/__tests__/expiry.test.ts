import { expiryLabel, expiryStatus } from '../expiry';

const now = new Date(2026, 9, 25, 18, 30);

test('counts calendar days, whatever the time of day', () => {
  expect(expiryStatus({ expiresOn: null }, now)).toEqual({ kind: 'none' });
  expect(expiryStatus({ expiresOn: '2026-10-24' }, now)).toEqual({ kind: 'expired', days: 1 });
  expect(expiryStatus({ expiresOn: '2026-10-25' }, now)).toEqual({ kind: 'today' });
  expect(expiryStatus({ expiresOn: '2026-10-26' }, now)).toEqual({ kind: 'soon', days: 1 });
  expect(expiryStatus({ expiresOn: '2026-11-24' }, now)).toEqual({ kind: 'soon', days: 30 });
  expect(expiryStatus({ expiresOn: '2026-11-25' }, now)).toEqual({ kind: 'later', days: 31 });
});

test('labels say how close a near expiry is and give the date for a far one', () => {
  expect(expiryLabel({ expiresOn: null }, now)).toBe('No expiry date');
  expect(expiryLabel({ expiresOn: '2026-10-20' }, now)).toBe('Expired 5 days ago');
  expect(expiryLabel({ expiresOn: '2026-10-25' }, now)).toBe('Expires today');
  expect(expiryLabel({ expiresOn: '2026-10-26' }, now)).toBe('Expires in 1 day');
  expect(expiryLabel({ expiresOn: '2027-03-01' }, now)).toBe('Expires Mar 1, 2027');
});

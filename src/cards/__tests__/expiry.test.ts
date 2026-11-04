import { expiryLabel, expiryStatus, needsExpiryAlert } from '../expiry';

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

test('a red alert shows inside the reminder window, on the day and once expired', () => {
  const at = new Date(2027, 0, 1, 12, 0);
  const alert = (expiresOn: string | null, remindDaysBefore = 14) => needsExpiryAlert({ expiresOn, remindDaysBefore }, at);
  expect(alert(null)).toBe(false);
  expect(alert('2027-01-16')).toBe(false); // 15 days out
  expect(alert('2027-01-15')).toBe(true); // 14 days: the first reminder
  expect(alert('2027-01-01')).toBe(true);
  expect(alert('2026-12-20')).toBe(true);
  expect(alert('2027-02-20', 60)).toBe(true); // its own window, past the 30-day "soon"
  expect(alert('2027-01-10', 3)).toBe(false);
});

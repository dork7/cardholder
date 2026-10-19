import { DAY_MS } from '../../config';
import { formatAgo, fromIsoDate, isValidIsoDate, parseIsoDate, toIsoDate } from '../dates';

test('parseIsoDate and isValidIsoDate', () => {
  expect(parseIsoDate('2027-01-05')).toEqual({ year: 2027, month: 1, day: 5 });
  expect(isValidIsoDate('2028-02-29')).toBe(true);
  expect(isValidIsoDate('2027-02-29')).toBe(false);
  expect(isValidIsoDate('2027-1-5')).toBe(false);
  expect(isValidIsoDate('yesterday')).toBe(false);
});

test('toIsoDate and fromIsoDate use local calendar days', () => {
  expect(toIsoDate(new Date(2027, 0, 5, 23, 30))).toBe('2027-01-05');
  const d = fromIsoDate('2027-12-31');
  expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2027, 11, 31, 0]);
  expect(() => fromIsoDate('2027-13-01')).toThrow();
});

test('formatAgo', () => {
  const now = 1_800_000_000_000;
  expect(formatAgo(now - 60_000, now)).toBe('today');
  expect(formatAgo(now + 60_000, now)).toBe('today');
  expect(formatAgo(now - DAY_MS, now)).toBe('yesterday');
  expect(formatAgo(now - 5 * DAY_MS, now)).toBe('5 days ago');
  expect(formatAgo(now - 45 * DAY_MS, now)).toBe('1 month ago');
  expect(formatAgo(now - 95 * DAY_MS, now)).toBe('3 months ago');
  expect(formatAgo(now - 400 * DAY_MS, now)).toBe('1 year ago');
  expect(formatAgo(now - 800 * DAY_MS, now)).toBe('2 years ago');
});

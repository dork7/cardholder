import { daysLeft } from '../recentlyDeleted';

const DAY = 24 * 60 * 60 * 1000;

test('a document deleted just now has the full 30 days left', () => {
  expect(daysLeft(1_000, 1_000)).toBe(30);
});

test('a part day counts as a day left', () => {
  expect(daysLeft(0, 2 * DAY + 1)).toBe(28);
  expect(daysLeft(0, 29 * DAY + 1)).toBe(1);
});

test('never fewer than none, even when a purge is overdue', () => {
  expect(daysLeft(0, 30 * DAY)).toBe(0);
  expect(daysLeft(0, 45 * DAY)).toBe(0);
});

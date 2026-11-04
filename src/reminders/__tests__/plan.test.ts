import { makeCard } from '../../../test/fixtures';
import { planReminders } from '../plan';

const now = new Date(2027, 0, 1, 12, 0);

test('one reminder a day at 09:00, from 14 days before expiry by default through the expiry day', () => {
  const plan = planReminders([makeCard({ id: 'c1', name: 'Emirates ID', expiresOn: '2027-06-30' })], now);
  expect(plan).toHaveLength(15);
  expect(plan[0]).toEqual({
    id: 'c1:14',
    cardId: 'c1',
    daysBefore: 14,
    fireAt: new Date(2027, 5, 16, 9, 0),
    title: 'Emirates ID expires in 14 days',
    body: 'Tap to open the card.',
  });
  expect(plan.map((r) => r.daysBefore)).toEqual([14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);
  expect(plan[13].title).toBe('Emirates ID expires in 1 day');
  expect(plan[14]).toMatchObject({ id: 'c1:0', fireAt: new Date(2027, 5, 30, 9, 0), title: 'Emirates ID expires today' });
});

test("follows the card's own number of days", () => {
  const plan = planReminders([makeCard({ id: 'c1', expiresOn: '2027-06-30', remindDaysBefore: 3 })], now);
  expect(plan.map((r) => r.id)).toEqual(['c1:3', 'c1:2', 'c1:1', 'c1:0']);
  expect(plan[0].fireAt).toEqual(new Date(2027, 5, 27, 9, 0));
});

test('reminders already in the past are skipped, and nothing comes after the expiry day', () => {
  const plan = planReminders([makeCard({ id: 'c1', expiresOn: '2027-01-03' })], now);
  expect(plan.map((r) => r.id)).toEqual(['c1:1', 'c1:0']); // c1:2 fired at 09:00 today;
  expect(planReminders([makeCard({ id: 'c2', expiresOn: '2026-12-01' })], now)).toEqual([]);
  // Expiring today, after 09:00: today's reminder has gone, and there's none tomorrow.
  expect(planReminders([makeCard({ id: 'c3', expiresOn: '2027-01-01' })], now)).toEqual([]);
});

test('cards without an expiry date get nothing', () => {
  expect(planReminders([makeCard({ expiresOn: null })], now)).toEqual([]);
});

test('sorted soonest first across cards', () => {
  const plan = planReminders(
    [
      makeCard({ id: 'late', expiresOn: '2027-12-01', remindDaysBefore: 1 }),
      makeCard({ id: 'soon', expiresOn: '2027-03-01', remindDaysBefore: 1 }),
    ],
    now,
  );
  expect(plan.map((r) => r.id)).toEqual(['soon:1', 'soon:0', 'late:1', 'late:0']);
});

test('caps the plan at the soonest 60 reminders', () => {
  const cards = Array.from({ length: 40 }, (_, i) =>
    makeCard({ id: `c${i}`, expiresOn: `2028-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}` }),
  );
  const plan = planReminders(cards, now);
  expect(plan).toHaveLength(60);
  const times = plan.map((r) => r.fireAt.getTime());
  expect([...times].sort((a, b) => a - b)).toEqual(times);
  const all = planReminders(cards, now, Infinity);
  expect(all).toHaveLength(40 * 15);
  expect(plan[59].fireAt.getTime()).toBeLessThanOrEqual(all[60].fireAt.getTime());
});

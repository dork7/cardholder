import { makeCard } from '../../../test/fixtures';
import { planReminders } from '../plan';

const now = new Date(2027, 0, 1, 12, 0);

test('two reminders per card at 09:00, 30 and 7 days before expiry', () => {
  const plan = planReminders([makeCard({ id: 'c1', name: 'Emirates ID', expiresOn: '2027-06-30' })], now);
  expect(plan).toEqual([
    {
      id: 'c1:30',
      cardId: 'c1',
      daysBefore: 30,
      fireAt: new Date(2027, 4, 31, 9, 0),
      title: 'Emirates ID expires in 30 days',
      body: 'Tap to open the card.',
    },
    {
      id: 'c1:7',
      cardId: 'c1',
      daysBefore: 7,
      fireAt: new Date(2027, 5, 23, 9, 0),
      title: 'Emirates ID expires in 7 days',
      body: 'Tap to open the card.',
    },
  ]);
});

test('reminders already in the past are skipped', () => {
  const plan = planReminders([makeCard({ id: 'c1', expiresOn: '2027-01-15' })], now);
  expect(plan.map((r) => r.id)).toEqual(['c1:7']);
  expect(planReminders([makeCard({ id: 'c2', expiresOn: '2026-12-01' })], now)).toEqual([]);
});

test('cards without an expiry date get nothing', () => {
  expect(planReminders([makeCard({ expiresOn: null })], now)).toEqual([]);
});

test('sorted soonest first across cards', () => {
  const plan = planReminders(
    [makeCard({ id: 'late', expiresOn: '2027-12-01' }), makeCard({ id: 'soon', expiresOn: '2027-03-01' })],
    now,
  );
  expect(plan.map((r) => r.id)).toEqual(['soon:30', 'soon:7', 'late:30', 'late:7']);
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
  expect(all).toHaveLength(80);
  expect(plan[59].fireAt.getTime()).toBeLessThanOrEqual(all[60].fireAt.getTime());
});

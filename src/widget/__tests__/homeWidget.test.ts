import { makeCard } from '../../../test/fixtures';
import { strings } from '../../strings';
import { MAX_WIDGET_CARDS, planWidget } from '../homeWidget';

const now = new Date(2026, 10, 1, 12);

test('shows the pinned cards in their pinned order, never the others', () => {
  const cards = [
    makeCard({ id: 'b', name: 'Bank', pinned: true, position: 1 }),
    makeCard({ id: 'x', name: 'Not pinned' }),
    makeCard({ id: 'a', name: 'Emirates ID', category: 'id', pinned: true, position: 0 }),
  ];
  expect(planWidget(cards, false, now)).toEqual({
    locked: false,
    cards: [
      { id: 'a', name: 'Emirates ID', note: strings.categories.id, warn: false },
      { id: 'b', name: 'Bank', note: strings.categories.membership, warn: false },
    ],
  });
});

test('as many cards as the widget has rows', () => {
  const cards = Array.from({ length: 6 }, (_, i) => makeCard({ id: `c${i}`, name: `Card ${i}`, pinned: true, position: i }));
  expect(planWidget(cards, false, now).cards).toHaveLength(MAX_WIDGET_CARDS);
});

test('a card close to expiry says when, as a date that stays right until the app next runs', () => {
  const soon = makeCard({ id: 's', pinned: true, expiresOn: '2026-11-20' });
  const gone = makeCard({ id: 'g', pinned: true, position: 1, expiresOn: '2026-10-01' });
  const later = makeCard({ id: 'l', pinned: true, position: 2, expiresOn: '2028-01-01', category: 'insurance' });
  const [s, g, l] = planWidget([soon, gone, later], false, now).cards;
  expect(s).toMatchObject({ note: strings.card.expiresOn('Nov 20, 2026'), warn: true });
  expect(g).toMatchObject({ note: strings.widget.expired('Oct 1, 2026'), warn: true });
  expect(l).toMatchObject({ note: strings.categories.insurance, warn: false });
});

test('an unnamed card goes by its category, as everywhere else', () => {
  expect(planWidget([makeCard({ id: 'u', name: '', category: 'insurance', pinned: true })], false, now).cards[0].name).toBe(
    strings.categories.insurance,
  );
});

test('with app lock on, nothing about any card leaves the app', () => {
  const cards = [makeCard({ id: 'a', name: 'Emirates ID', pinned: true })];
  expect(planWidget(cards, true, now)).toEqual({ locked: true, cards: [] });
});

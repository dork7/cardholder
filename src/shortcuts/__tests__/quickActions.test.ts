import { makeCard } from '../../../test/fixtures';
import { strings } from '../../strings';
import { planShortcuts, shortcutHref } from '../quickActions';

jest.mock('expo-quick-actions', () => ({ setItems: jest.fn() }));

test('the first three pinned cards, in pinned order, then Add card', () => {
  const cards = [
    makeCard({ id: 'u', name: 'Unpinned' }),
    ...['a', 'b', 'c', 'd'].map((id, position) => makeCard({ id, name: id.toUpperCase(), pinned: true, position })),
  ];
  expect(planShortcuts(cards).map((a) => [a.title, a.params?.href])).toEqual([
    ['A', '/card/a'],
    ['B', '/card/b'],
    ['C', '/card/c'],
    [strings.home.addCard, '/edit/new'],
  ]);
});

test('only links to a card or the editor are followed', () => {
  expect(shortcutHref({ id: 'x', title: 'x', params: { href: '/card/abc_1' } })).toBe('/card/abc_1');
  expect(shortcutHref({ id: 'add', title: 'Add', params: { href: '/edit/new' } })).toBe('/edit/new');
  expect(shortcutHref({ id: 'x', title: 'x', params: { href: '/settings/../export' } })).toBeNull();
  expect(shortcutHref(null)).toBeNull();
});

import * as QuickActions from 'expo-quick-actions';
import { makeCard } from '../../../test/fixtures';
import { strings } from '../../strings';
import { planShortcuts, shortcutHref, syncShortcuts } from '../quickActions';

jest.mock('expo-quick-actions', () => ({ setItems: jest.fn(), maxCount: 4 }));

beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());

test('an empty library offers a blank note and the document import editor', () => {
  expect(planShortcuts([]).map((a) => [a.title, a.params?.href])).toEqual([
    ['New note', '/note/new'],
    ['Add document', '/edit/new'],
  ]);
});

test('a four-slot launcher keeps both creation actions and the first two pins in pinned order', () => {
  const cards = [
    makeCard({ id: 'u', name: 'Unpinned' }),
    ...['d', 'c', 'b', 'a'].map((id, position) => makeCard({ id, name: id.toUpperCase(), pinned: true, position: 3 - position })),
  ];
  expect(planShortcuts(cards).map((a) => [a.title, a.params?.href])).toEqual([
    ['New note', '/note/new'],
    ['Show A', '/card/a?show=1'],
    ['Show B', '/card/b?show=1'],
    [strings.home.addCard, '/edit/new'],
  ]);
});

test('existing links to a document or the import editor still work', () => {
  expect(shortcutHref({ id: 'x', title: 'x', params: { href: '/card/abc_1' } })).toBe('/card/abc_1');
  expect(shortcutHref({ id: 'add', title: 'Add', params: { href: '/edit/new' } })).toBe('/edit/new');
  expect(shortcutHref({ id: 'x', title: 'x', params: { href: '/settings/../export' } })).toBeNull();
  expect(shortcutHref(null)).toBeNull();
});

test('larger launchers offer at most three pinned documents', () => {
  jest.replaceProperty(QuickActions, 'maxCount', 10);
  expect(planShortcuts(['a', 'b', 'c', 'd'].map((id) => makeCard({ id, pinned: true }))).map((a) => a.id)).toEqual([
    'note', 'card:a', 'card:b', 'card:c', 'add',
  ]);
});

test('a launcher with only two slots still offers both creation actions', () => {
  jest.replaceProperty(QuickActions, 'maxCount', 2);
  expect(planShortcuts([makeCard({ pinned: true })]).map((a) => a.id)).toEqual(['note', 'add']);
});

test('unknown launcher capacity defaults to four slots', () => {
  jest.replaceProperty(QuickActions, 'maxCount', undefined);
  expect(planShortcuts(['a', 'b', 'c'].map((id) => makeCard({ id, pinned: true }))).map((a) => a.id)).toEqual([
    'note', 'card:a', 'card:b', 'add',
  ]);
});

test('sync replaces launcher entries after pins, names, order or documents change', async () => {
  const a = makeCard({ id: 'a', name: 'Passport', pinned: true, position: 0 });
  const b = makeCard({ id: 'b', name: 'Licence', pinned: true, position: 1 });
  await syncShortcuts([a, b]);
  await syncShortcuts([{ ...a, position: 2 }, { ...b, name: 'Driving licence', position: 0 }]);
  await syncShortcuts([{ ...a, pinned: false }, b]);
  await syncShortcuts([]);
  expect(jest.mocked(QuickActions.setItems).mock.calls.map(([items]) => items!.map((a) => a.title))).toEqual([
    ['New note', 'Show Passport', 'Show Licence', 'Add document'],
    ['New note', 'Show Driving licence', 'Show Passport', 'Add document'],
    ['New note', 'Show Licence', 'Add document'],
    ['New note', 'Add document'],
  ]);
});

test('new shortcut destinations are allowed without permitting other routes or query parameters', () => {
  const action = (href: string) => ({ id: 'x', title: 'x', params: { href } });
  expect(shortcutHref(action('/note/new'))).toBe('/note/new');
  expect(shortcutHref(action('/card/abc_1?show=1'))).toBe('/card/abc_1?show=1');
  for (const href of ['/note/private', '/card/a?show=0', '/card/a?show=1&extra=true', '/card/../settings', 'https://example.com']) {
    expect(shortcutHref(action(href))).toBeNull();
  }
});

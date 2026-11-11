import { fields, makeCard } from '../../../test/fixtures';
import { findDuplicate } from '../duplicates';

const KEY = 'c'.repeat(64);
const saved = [
  makeCard({ id: 'eid', name: 'Emirates ID', tags: ['ID'], documentKey: KEY }),
  makeCard({ id: 'gym', name: 'Gym', tags: ['Membership'] }),
  makeCard({ id: 'blank', name: '', tags: [] }),
];

test('the same document matches whatever it is called', () => {
  expect(findDuplicate(fields({ name: 'My ID', tags: ['ID'], documentKey: KEY }), saved)?.id).toBe('eid');
});

test('otherwise the same name on a card that shares a tag, ignoring case and spaces', () => {
  expect(findDuplicate(fields({ name: ' gym ', tags: ['Sport', 'membership'] }), saved)?.id).toBe('gym');
  expect(findDuplicate(fields({ name: 'Gym', tags: ['Sport'] }), saved)).toBeNull();
  expect(findDuplicate(fields({ name: 'Gym', tags: [] }), saved)).toBeNull();
});

test('untagged cards match each other by name', () => {
  const untagged = [makeCard({ id: 'lib', name: 'Library', tags: [] })];
  expect(findDuplicate(fields({ name: 'library', tags: [] }), untagged)?.id).toBe('lib');
  expect(findDuplicate(fields({ name: 'library', tags: ['Membership'] }), untagged)).toBeNull();
});

test('unnamed cards never match by name', () => {
  expect(findDuplicate(fields({ name: '', tags: [] }), saved)).toBeNull();
});

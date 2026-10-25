import { fields, makeCard } from '../../../test/fixtures';
import { findDuplicate } from '../duplicates';

const KEY = 'c'.repeat(64);
const saved = [
  makeCard({ id: 'eid', name: 'Emirates ID', category: 'id', documentKey: KEY }),
  makeCard({ id: 'gym', name: 'Gym', category: 'membership' }),
  makeCard({ id: 'blank', name: '', category: 'other' }),
];

test('the same document matches whatever it is called', () => {
  expect(findDuplicate(fields({ name: 'My ID', category: 'id', documentKey: KEY }), saved)?.id).toBe('eid');
});

test('otherwise the same name in the same category, ignoring case and spaces', () => {
  expect(findDuplicate(fields({ name: ' gym ', category: 'membership' }), saved)?.id).toBe('gym');
  expect(findDuplicate(fields({ name: 'Gym', category: 'other' }), saved)).toBeNull();
});

test('unnamed cards never match by name', () => {
  expect(findDuplicate(fields({ name: '', category: 'other' }), saved)).toBeNull();
});

import { strings } from '../strings';

// GLOSSARY.md: what the user keeps is a "document", never a "card".
function texts(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (typeof value === 'function') {
    const fn = value as (...args: unknown[]) => unknown;
    return [...texts(fn(2, 'Passport', 2, 2)), ...texts(fn(1, 'Passport', 1, 1))];
  }
  if (Array.isArray(value)) return value.flatMap(texts);
  if (value && typeof value === 'object') return Object.values(value).flatMap(texts);
  return [];
}

test('no text the user sees calls a document a card', () => {
  const offenders = texts(strings).filter((t) => /\bcards?\b/i.test(t));
  expect(offenders).toEqual([]);
});

test('Recently deleted says how long it keeps documents, from the setting', () => {
  jest.isolateModules(() => {
    jest.doMock('../config', () => ({ ...jest.requireActual('../config'), RECENTLY_DELETED_DAYS: 45 }));
    const { strings: s } = require('../strings') as typeof import('../strings');
    expect(s.recentlyDeleted.intro).toBe('Deleted documents are kept here for 45 days, then erased.');
    expect(s.recentlyDeleted.empty).toBe('Nothing here. Deleted documents are kept for 45 days, then erased.');
  });
});

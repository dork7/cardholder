import { TAG_MAX_LENGTH } from '../config';
import { strings } from '../strings';
import { Card } from './types';

export const sameTag = (a: string, b: string): boolean => a.toLocaleLowerCase() === b.toLocaleLowerCase();

export const hasTag = (card: Pick<Card, 'tags'>, tag: string): boolean => card.tags.some((t) => sameTag(t, tag));

// Trims and collapses spaces, drops blanks and case-insensitive repeats (the first spelling wins).
export function normalizeTags(tags: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const tag = raw.trim().replace(/\s+/g, ' ');
    const key = tag.toLocaleLowerCase();
    if (tag === '' || seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out;
}

// Every tag in use, each spelled as it first appears, in alphabetical order.
export const allTags = (cards: readonly Pick<Card, 'tags'>[]): string[] =>
  normalizeTags(cards.flatMap((c) => c.tags)).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

// The tags the app offers before the user has made any of their own.
export const STARTER_TAGS: readonly string[] = Object.values(strings.tags.starters);

// What a tag picker offers: every tag in use, then the starters nothing uses yet.
export const tagOptions = (cards: readonly Pick<Card, 'tags'>[]): string[] => normalizeTags([...allTags(cards), ...STARTER_TAGS]);

// A name the user typed → the tag it names: one already known, ignoring case (so "insurance" picks
// Insurance), else a new tag as typed. null when blank or too long.
export function resolveTag(typed: string, known: readonly string[]): string | null {
  const [name] = normalizeTags([typed]);
  if (!name || [...name].length > TAG_MAX_LENGTH) return null;
  return [...known, ...STARTER_TAGS].find((t) => sameTag(t, name)) ?? name;
}

export const cardsWithTag = <C extends Pick<Card, 'tags'>>(tag: string, cards: readonly C[]): C[] =>
  cards.filter((c) => hasTag(c, tag));

// An ID is the one document worth a second thought before an unencrypted copy leaves the app.
export const isId = (card: Pick<Card, 'tags'>): boolean => hasTag(card, strings.tags.starters.id);

// Cards and backups saved before categories became tags hold a `category`: a built-in key, a retired
// one, or a name the user typed. The tag it becomes; null for "other", which meant no group at all.
const LEGACY_CATEGORIES = new Map<string, string | null>([
  ['id', strings.tags.starters.id],
  ['insurance', strings.tags.starters.insurance],
  ['membership', strings.tags.starters.membership],
  ['other', null],
  ['loyalty', null],
]);

export function legacyCategoryTag(category: unknown): string | null {
  if (typeof category !== 'string') return null;
  const builtIn = LEGACY_CATEGORIES.get(category);
  if (builtIn !== undefined) return builtIn;
  const [name] = normalizeTags([category]);
  return name && [...name].length <= TAG_MAX_LENGTH ? name : null;
}

// A card's tags with its old category first, as it was the card's main group.
export function withLegacyCategory(tags: readonly string[], category: unknown): string[] {
  const tag = legacyCategoryTag(category);
  return tag ? normalizeTags([tag, ...tags]) : [...tags];
}

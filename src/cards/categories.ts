import { strings } from '../strings';
import { Card, CardCategory, categoryName, CATEGORIES, isBuiltInCategory } from './types';

export function categoryLabel(category: CardCategory): string {
  return isBuiltInCategory(category) ? strings.categories[category] : category;
}

// What a category picker offers: the saved list, then any category a card holds that the list
// doesn't (a card from a backup, say), so every card's category can always be picked again.
export function categoryOptions(saved: readonly CardCategory[], cards: readonly Pick<Card, 'category'>[]): CardCategory[] {
  const options = [...saved];
  for (const { category } of cards) if (!options.includes(category)) options.push(category);
  return options;
}

const fold = (v: string) => v.toLocaleLowerCase();

// A name the user typed → the category it names, ignoring case (its label or key, so "insurance"
// picks Insurance), else a new category of that name. null when blank or too long.
export function resolveCategory(typed: string, known: readonly CardCategory[]): CardCategory | null {
  const name = categoryName(typed);
  if (!name) return null;
  const match = [...known, ...CATEGORIES].find((c) => fold(c) === fold(name) || fold(categoryLabel(c)) === fold(name));
  if (match) return match;
  // Capitalised, so a new name can never be read back as a built-in or retired key ("loyalty").
  return name.charAt(0).toLocaleUpperCase() + name.slice(1);
}

// Cards that use a category, so it can't be deleted from under them.
export const cardsInCategory = <C extends Pick<Card, 'category'>>(category: CardCategory, cards: readonly C[]): C[] =>
  cards.filter((c) => c.category === category);

import { CardAnalysis } from '../analysis/types';
import { Category, Folder } from '../cards/types';
import { strings } from '../strings';
import { findFolderNamed } from './names';

export type FolderSuggestion = { kind: 'existing'; folderId: string } | { kind: 'new'; name: string } | { kind: 'none' };

// Words a folder name often has that say nothing about what's in it.
const FILLER = new Set(['my', 'the', 'and', 'card', 'doc', 'document', 'other', 'misc']);
// Printed on all kinds of cards ("Member ID" on an insurance card), so finding one on the card says
// nothing; a folder named with one is still matched through the card's category.
const COMMON = new Set(['id', 'member', 'number', 'name', 'date']);

// Words that mean a folder holds a category's cards, so "Health" takes an insurance card that never
// says "health" itself. Singular; plurals are folded before matching.
const CATEGORY_WORDS: Record<Category, string[]> = {
  id: ['id', 'identity', 'identification', 'passport', 'licence', 'license', 'personal', 'government', 'هوية', 'جواز'],
  insurance: ['insurance', 'health', 'medical', 'takaful', 'تأمين'],
  membership: ['membership', 'member', 'club', 'gym', 'fitness', 'loyalty', 'reward', 'عضوية', 'نادي'],
  other: [],
};

// Lower case, accents dropped, split on anything that isn't a letter or digit, plurals folded.
export function words(text: string): string[] {
  return text
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w !== '')
    .map((w) => (w.length >= 3 && /[^su]s$/.test(w) ? w.slice(0, -1) : w));
}

const meaningful = (name: string) => words(name).filter((w) => !FILLER.has(w) && (w.length >= 3 || w === 'id'));

// How well a folder fits: its own words found on the card count most, then words that name the
// card's category. 0 means it doesn't fit.
function score(folder: Folder, cardWords: Set<string>, category: Category | undefined): number {
  const own = meaningful(folder.name);
  if (own.length === 0) return 0;
  const found = own.filter((w) => !COMMON.has(w) && cardWords.has(w)).length;
  const categoryWords = category ? CATEGORY_WORDS[category].flatMap(words) : [];
  const byCategory = own.some((w) => categoryWords.includes(w)) ? 2 : 0;
  return 3 * found + byCategory;
}

// Picks the folder a newly read card belongs in, or, when none fits, a folder to create for it.
// Nothing is suggested from a card that couldn't be read, or when two folders fit equally well.
export function suggestFolder(analysis: CardAnalysis, folders: Folder[]): FolderSuggestion {
  const category = analysis.category?.value;
  const cardWords = new Set(words([analysis.text ?? '', analysis.name?.value ?? ''].join('\n')));
  if (cardWords.size === 0 && !category) return { kind: 'none' };

  const ranked = folders
    .map((folder) => ({ folder, score: score(folder, cardWords, category) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
  if (ranked.length > 0) {
    if (ranked.length > 1 && ranked[0].score === ranked[1].score) return { kind: 'none' };
    return { kind: 'existing', folderId: ranked[0].folder.id };
  }

  const name = category ? strings.folders.suggestedNames[category] : null;
  if (!name) return { kind: 'none' };
  // Already there under the same name but with words the rules don't know: use it, don't duplicate it.
  const same = findFolderNamed(folders, name);
  return same ? { kind: 'existing', folderId: same.id } : { kind: 'new', name };
}

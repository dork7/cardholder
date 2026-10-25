import { MAX_TAGS } from '../config';
import { canAddCard } from '../purchases/limits';
import { Card, CardFields, CardImage, Category, FrontImage, ImageChanges, NewCardImages } from './types';
import { FieldError, normalizeTags, validateCardFields } from './validate';

export interface EditDraft {
  name: string;
  category: Category;
  expiresOn: string | null;
  tags: string[];
  documentKey: string | null;
  front: FrontImage | null; // newly captured only
  back: CardImage | null; // newly captured only
  removeBack: boolean;
}

export type SaveError = FieldError | 'front-required';

export type SavePlan =
  | { kind: 'invalid'; errors: SaveError[] }
  | { kind: 'limit-reached' }
  | { kind: 'create'; fields: CardFields; images: NewCardImages }
  | { kind: 'update'; id: string; fields: CardFields; changes: ImageChanges };

export function draftFor(card: Card | null): EditDraft {
  return {
    name: card?.name ?? '',
    category: card?.category ?? 'id',
    expiresOn: card?.expiresOn ?? null,
    tags: card?.tags ?? [],
    documentKey: card?.documentKey ?? null,
    front: null,
    back: null,
    removeBack: false,
  };
}

export function planSave(
  draft: EditDraft,
  ctx: { existing: Card | null; cardCount: number; unlocked: boolean },
): SavePlan {
  const validation = validateCardFields(draft);
  const errors: SaveError[] = validation.ok ? [] : [...validation.errors];
  if (!ctx.existing && !draft.front) errors.push('front-required');
  if (!validation.ok || errors.length > 0) return { kind: 'invalid', errors };

  if (ctx.existing) {
    const changes: ImageChanges = {};
    if (draft.front) changes.front = draft.front;
    if (draft.back) changes.back = draft.back;
    else if (draft.removeBack) changes.back = null;
    return { kind: 'update', id: ctx.existing.id, fields: validation.value, changes };
  }

  if (!canAddCard(ctx.cardCount, ctx.unlocked)) return { kind: 'limit-reached' };
  // front is non-null here: a missing front was reported as 'front-required' above.
  return { kind: 'create', fields: validation.value, images: { front: draft.front as FrontImage, back: draft.back } };
}

// Suggestions from reading the card's photos (src/analysis/). They fill the form, never save it, and
// never overwrite something the user chose.
export const SUGGESTABLE = ['name', 'category', 'expiresOn', 'tags'] as const;
export type Suggestable = (typeof SUGGESTABLE)[number];

export interface FormState {
  draft: EditDraft;
  suggested: Partial<Record<Suggestable, number>>; // field → confidence of the suggestion it holds
  touched: Suggestable[]; // fields the user set; suggestions leave them alone
}

export function formFor(card: Card | null): FormState {
  // An existing card's category was chosen by the user; its name and expiry may still be blank.
  return { draft: draftFor(card), suggested: {}, touched: card ? ['category'] : [] };
}

const isSuggestable = (key: string): key is Suggestable => (SUGGESTABLE as readonly string[]).includes(key);

// A user edit: marks the field as theirs and drops its "Suggested" tag.
export function editField(state: FormState, patch: Partial<EditDraft>): FormState {
  const fields = Object.keys(patch).filter(isSuggestable);
  const suggested = { ...state.suggested };
  for (const f of fields) delete suggested[f];
  const touched = [...state.touched, ...fields.filter((f) => !state.touched.includes(f))];
  return { draft: { ...state.draft, ...patch }, suggested, touched };
}

export function applyAnalysis(
  state: FormState,
  analysis: { [F in Suggestable]?: { value: EditDraft[F]; confidence: number } } & { documentKey?: string },
): FormState {
  let { draft, suggested } = state;
  // Not a field anyone sees or edits: the newest photo that names its document wins.
  if (analysis.documentKey) draft = { ...draft, documentKey: analysis.documentKey };
  for (const field of SUGGESTABLE) {
    const guess = analysis[field];
    if (!guess || state.touched.includes(field)) continue;
    // Tags add up: the front and the back can each find some, and tags already there stay.
    if (field === 'tags') {
      const tags = normalizeTags([...draft.tags, ...(guess.value as string[])]).slice(0, MAX_TAGS);
      if (tags.length === draft.tags.length) continue;
      draft = { ...draft, tags };
      suggested = { ...suggested, tags: Math.max(guess.confidence, suggested.tags ?? 0) };
      continue;
    }
    const held = suggested[field];
    // Fill a blank field, or replace an earlier, weaker suggestion (e.g. the back's MRZ beats a date
    // guessed from the front). Category is never blank, so it only takes the first or a stronger one.
    const blank = field === 'category' ? true : draft[field] === '' || draft[field] === null;
    const allowed = held === undefined ? blank : guess.confidence > held;
    if (!allowed) continue;
    draft = { ...draft, [field]: guess.value };
    suggested = { ...suggested, [field]: guess.confidence };
  }
  return { ...state, draft, suggested };
}

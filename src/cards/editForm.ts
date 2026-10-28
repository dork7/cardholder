import { FolderSuggestion } from '../folders/suggest';
import { canAddCard } from '../purchases/limits';
import { Card, CardCategory, CardFields, CardImage, FrontImage, ImageChanges, NewCardImages, PdfDocument } from './types';
import { FieldError, validateCardFields } from './validate';

export interface EditDraft {
  name: string;
  category: CardCategory;
  expiresOn: string | null;
  tags: string[]; // no longer shown or edited; kept so a card's saved tags survive an edit
  documentKey: string | null;
  folderId: string | null;
  newFolderName: string | null; // a folder to create on save and put the card in; folderId is then null
  front: FrontImage | null; // newly captured only; for a PDF, its cover page
  back: CardImage | null; // newly captured only
  removeBack: boolean;
  pdf: PdfDocument | null; // newly picked, or the saved one with a different cover page
  removePdf: boolean; // a photo replaced the saved PDF
}

export type SaveError = FieldError | 'front-required';

export type SavePlan =
  | { kind: 'invalid'; errors: SaveError[] }
  | { kind: 'limit-reached' }
  | { kind: 'create'; fields: CardFields; images: NewCardImages; newFolder: string | null }
  | { kind: 'update'; id: string; fields: CardFields; changes: ImageChanges; newFolder: string | null };

// A new card starts in `defaultCategory`: the first one offered, as built-ins can be deleted.
export function draftFor(card: Card | null, defaultCategory: CardCategory = 'id'): EditDraft {
  return {
    name: card?.name ?? '',
    category: card?.category ?? defaultCategory,
    expiresOn: card?.expiresOn ?? null,
    tags: card?.tags ?? [],
    documentKey: card?.documentKey ?? null,
    folderId: card?.folderId ?? null,
    newFolderName: null,
    front: null,
    back: null,
    removeBack: false,
    pdf: null,
    removePdf: false,
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
    if (draft.pdf) changes.pdf = draft.pdf;
    else if (draft.removePdf) changes.pdf = null;
    return { kind: 'update', id: ctx.existing.id, fields: validation.value, changes, newFolder: draft.newFolderName };
  }

  if (!canAddCard(ctx.cardCount, ctx.unlocked)) return { kind: 'limit-reached' };
  // front is non-null here: a missing front was reported as 'front-required' above.
  return {
    kind: 'create',
    fields: validation.value,
    images: { front: draft.front as FrontImage, back: draft.back, ...(draft.pdf && { pdf: draft.pdf }) },
    newFolder: draft.newFolderName,
  };
}

// Suggestions from reading the card's photos (src/analysis/). They fill the form, never save it, and
// never overwrite something the user chose.
export const SUGGESTABLE = ['name', 'category', 'expiresOn'] as const;
export type Suggestable = (typeof SUGGESTABLE)[number];

type Touchable = Suggestable | 'folder';

export interface FormState {
  draft: EditDraft;
  suggested: Partial<Record<Suggestable, number>>; // field → confidence of the suggestion it holds
  touched: Touchable[]; // fields the user set; suggestions leave them alone
  folderSuggested: boolean; // draft.folderId was picked from the photo
  folderOffer: string | null; // no folder fits: the name of one the user can create for the card
}

export function formFor(card: Card | null, defaultCategory?: CardCategory): FormState {
  // An existing card's category was chosen by the user, and so was its folder if it has one; its
  // name and expiry may still be blank.
  const touched: Touchable[] = card ? ['category'] : [];
  if (card?.folderId) touched.push('folder');
  return { draft: draftFor(card, defaultCategory), suggested: {}, touched, folderSuggested: false, folderOffer: null };
}

const isSuggestable = (key: string): key is Suggestable => (SUGGESTABLE as readonly string[]).includes(key);

// A user edit: marks the field as theirs and drops its "Suggested" tag.
export function editField(state: FormState, patch: Partial<EditDraft>): FormState {
  const fields: Touchable[] = Object.keys(patch).filter(isSuggestable);
  const suggested = { ...state.suggested };
  for (const f of fields) delete suggested[f as Suggestable];
  const folderChanged = 'folderId' in patch || 'newFolderName' in patch;
  if (folderChanged) fields.push('folder');
  const touched = [...state.touched, ...fields.filter((f) => !state.touched.includes(f))];
  return {
    ...state,
    draft: { ...state.draft, ...patch },
    suggested,
    touched,
    folderSuggested: folderChanged ? false : state.folderSuggested,
    folderOffer: folderChanged ? null : state.folderOffer,
  };
}

// Puts the card in the folder its photo fits, or offers to create one. Like the other suggestions it
// never overrides the user's own pick; a later, clearer read (e.g. the back) may replace it.
export function applyFolderSuggestion(state: FormState, suggestion: FolderSuggestion): FormState {
  if (state.touched.includes('folder') || suggestion.kind === 'none') return state;
  if (suggestion.kind === 'existing') {
    return {
      ...state,
      draft: { ...state.draft, folderId: suggestion.folderId, newFolderName: null },
      folderSuggested: true,
      folderOffer: null,
    };
  }
  // An earlier read already routed it to a folder that exists; keep that over a new one.
  if (state.draft.folderId !== null) return state;
  return { ...state, folderOffer: suggestion.name };
}

// The user took the offer: the folder is created when the card is saved.
export function acceptFolderOffer(state: FormState): FormState {
  if (!state.folderOffer) return state;
  return editField(state, { folderId: null, newFolderName: state.folderOffer });
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

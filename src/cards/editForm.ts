import { FolderSuggestion } from '../folders/suggest';
import { canAddCard } from '../purchases/limits';
import { DEFAULT_REMIND_DAYS, READ_TEXT_MAX_LENGTH } from '../config';
import { Card, CardCategory, CardFields, CardImage, CardText, FrontImage, ImageChanges, NewCardImages, PdfDocument } from './types';
import { FieldError, parseRemindDays, validateCardFields } from './validate';

export interface EditDraft {
  name: string;
  category: CardCategory;
  expiresOn: string | null;
  remindDaysBefore: string; // as typed; checked on save
  tags: string[]; // not edited here (tags are added from the card screen and the gallery); kept so an edit keeps them
  documentKey: string | null;
  folderId: string | null;
  readText: CardText | null; // see CardFields; set as each photo is read
  unreadSides: (keyof CardText)[]; // sides with a photo not read yet; saved as unread so it's read later
  newFolderName: string | null; // a folder to create on save and put the card in; folderId is then null
  front: FrontImage | null; // newly captured only; for a PDF, its cover page
  back: CardImage | null; // newly captured only
  removeBack: boolean;
  pdf: PdfDocument | null; // newly picked, or the saved one with a different cover page
  removePdf: boolean; // a photo replaced the saved PDF
  vertical: boolean; // set from each new front picture's shape; the user can change it
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
    remindDaysBefore: String(card?.remindDaysBefore ?? DEFAULT_REMIND_DAYS),
    tags: card?.tags ?? [],
    documentKey: card?.documentKey ?? null,
    folderId: card?.folderId ?? null,
    readText: card?.readText ?? null,
    // A card never read is read in full later (readUnreadCards). Only sides that have a photo count,
    // so reading the one photo of a front-only card is enough to save it as read.
    unreadSides: unreadSidesOf(card),
    newFolderName: null,
    front: null,
    back: null,
    removeBack: false,
    pdf: null,
    removePdf: false,
    vertical: card?.vertical ?? false,
  };
}

export function planSave(
  draft: EditDraft,
  ctx: { existing: Card | null; cardCount: number; unlocked: boolean },
): SavePlan {
  // The reminder field is hidden without an expiry date, so whatever it holds then can't block a save.
  const hiddenBadReminder = draft.expiresOn === null && parseRemindDays(draft.remindDaysBefore) === null;
  const validation = validateCardFields(hiddenBadReminder ? { ...draft, remindDaysBefore: DEFAULT_REMIND_DAYS } : draft);
  const errors: SaveError[] = validation.ok ? [] : [...validation.errors];
  if (!ctx.existing && !draft.front) errors.push('front-required');
  if (!validation.ok || errors.length > 0) return { kind: 'invalid', errors };

  // Text from an older photo is never kept for a new one; a side not read yet leaves the card unread.
  const fields = { ...validation.value, readText: draft.unreadSides.length > 0 ? null : validation.value.readText };

  if (ctx.existing) {
    const changes: ImageChanges = {};
    if (draft.front) changes.front = draft.front;
    if (draft.back) changes.back = draft.back;
    else if (draft.removeBack) changes.back = null;
    if (draft.pdf) changes.pdf = draft.pdf;
    else if (draft.removePdf) changes.pdf = null;
    return { kind: 'update', id: ctx.existing.id, fields, changes, newFolder: draft.newFolderName };
  }

  if (!canAddCard(ctx.cardCount, ctx.unlocked)) return { kind: 'limit-reached' };
  // front is non-null here: a missing front was reported as 'front-required' above.
  return {
    kind: 'create',
    fields,
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
  let draft = { ...state.draft, ...patch };
  // A new photo's text isn't known until it is read (applyReadText).
  for (const side of ['front', 'back'] as const) {
    if (!patch[side]) continue;
    draft = noteUnread(withSideText(draft, side, ''), side);
  }
  return {
    ...state,
    draft,
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

// Keeps what was read off one side, for search. A card that was never read starts with both sides blank;
// a side whose photo is removed is blanked (removeReadSide).
export function applyReadText(state: FormState, side: keyof CardText, text: string): FormState {
  const draft = withSideText(state.draft, side, text.slice(0, READ_TEXT_MAX_LENGTH), { create: true });
  return { ...state, draft: dropUnread(draft, side) };
}

export function removeReadSide(state: FormState, side: keyof CardText): FormState {
  return { ...state, draft: dropUnread(withSideText(state.draft, side, ''), side) };
}

// Sides still waiting on a read. A card that already has text has none; a card with no back has no back to read.
function unreadSidesOf(card: Card | null): (keyof CardText)[] {
  if (!card || card.readText !== null) return [];
  return card.hasBack ? ['front', 'back'] : ['front'];
}

function noteUnread(draft: EditDraft, side: keyof CardText): EditDraft {
  return draft.unreadSides.includes(side) ? draft : { ...draft, unreadSides: [...draft.unreadSides, side] };
}

function dropUnread(draft: EditDraft, side: keyof CardText): EditDraft {
  return { ...draft, unreadSides: draft.unreadSides.filter((s) => s !== side) };
}

// Sets one side's text. `create` begins a text record for a card that has none; without it, that card stays unread.
function withSideText(draft: EditDraft, side: keyof CardText, text: string, { create = false } = {}): EditDraft {
  if (!draft.readText && !create) return draft;
  return { ...draft, readText: { ...(draft.readText ?? { front: '', back: '' }), [side]: text } };
}

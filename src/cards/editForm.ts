import { canAddCard } from '../purchases/limits';
import { Card, CardFields, CardImage, Category, FrontImage, ImageChanges, NewCardImages } from './types';
import { FieldError, validateCardFields } from './validate';

export interface EditDraft {
  name: string;
  category: Category;
  expiresOn: string | null;
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

export const CATEGORIES = ['id', 'insurance', 'membership', 'other'] as const;
export type Category = (typeof CATEGORIES)[number];

// Categories that were dropped, and where cards saved under them now belong.
const RETIRED_CATEGORIES = new Map<string, Category>([['loyalty', 'other']]);

// Reads a category from storage or a backup file, moving cards off retired categories.
export function toCategory(v: unknown): Category | undefined {
  if (typeof v !== 'string') return undefined;
  return CATEGORIES.find((c) => c === v) ?? RETIRED_CATEGORIES.get(v);
}

export interface CardFields {
  name: string; // '' when the card has no name
  category: Category;
  expiresOn: string | null; // YYYY-MM-DD, local calendar day
  tags: string[]; // free-form, deduplicated ignoring case; [] when there are none
  documentKey: string | null; // hash of the document's own number, for spotting duplicates (src/analysis/documentKey.ts)
  folderId: string | null; // null when the card isn't in a folder
}

// A user-made group of cards. Its name is sealed like a card's; the id is random.
export interface Folder {
  id: string;
  name: string;
  createdAt: number;
}

export interface CardImage {
  jpegBase64: string;
  aspect: number; // width / height
}

export interface FrontImage extends CardImage {
  thumbJpegBase64: string;
}

export interface NewCardImages {
  front: FrontImage;
  back: CardImage | null;
}

// Omitted key = unchanged. back: null removes the back image.
export interface ImageChanges {
  front?: FrontImage;
  back?: CardImage | null;
}

export type ImageSide = 'front' | 'back' | 'thumb';

export interface Card extends CardFields {
  id: string;
  pinned: boolean;
  position: number;
  hasBack: boolean;
  frontAspect: number;
  backAspect: number | null;
  createdAt: number;
  updatedAt: number;
}

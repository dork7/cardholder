import { CATEGORY_MAX_LENGTH } from '../config';

// The categories the app comes with, stored by these keys and shown by their labels in strings.ts.
export const CATEGORIES = ['id', 'insurance', 'membership', 'other'] as const;
export type Category = (typeof CATEGORIES)[number];

// A card's category: one the app comes with, or the name of one the user typed (stored as typed,
// e.g. "Vehicle"). A typed name never equals a built-in key (see resolveCategory).
export type CardCategory = Category | (string & {});

export const isBuiltInCategory = (v: string): v is Category => (CATEGORIES as readonly string[]).includes(v);

// Categories that were dropped, and where cards saved under them now belong.
const RETIRED_CATEGORIES = new Map<string, Category>([['loyalty', 'other']]);

// Trims and collapses spaces; null when blank or too long.
export function categoryName(v: string): string | null {
  const name = v.trim().replace(/\s+/g, ' ');
  return name !== '' && [...name].length <= CATEGORY_MAX_LENGTH ? name : null;
}

// Reads a category from storage or a backup file, moving cards off retired categories.
export function toCategory(v: unknown): CardCategory | undefined {
  if (typeof v !== 'string') return undefined;
  const builtIn = CATEGORIES.find((c) => c === v) ?? RETIRED_CATEGORIES.get(v);
  return builtIn ?? categoryName(v) ?? undefined;
}

export interface CardFields {
  name: string; // '' when the card has no name
  category: CardCategory;
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

// A card kept as a whole PDF. The file is stored as it came; one page, the cover, is rendered as the
// card's front picture so the home screen and search work as for a photo.
export interface CardPdf {
  pageCount: number;
  coverPage: number; // zero-based
}

export interface PdfDocument extends CardPdf {
  pdfBase64: string;
}

export interface NewCardImages {
  front: FrontImage; // for a PDF card, the cover page
  back: CardImage | null;
  pdf?: PdfDocument | null; // omitted or null: a photo card
}

// Omitted key = unchanged. back: null removes the back image; pdf: null removes the PDF.
export interface ImageChanges {
  front?: FrontImage;
  back?: CardImage | null;
  pdf?: PdfDocument | null;
}

export type ImageSide = 'front' | 'back' | 'thumb';

export interface Card extends CardFields {
  id: string;
  pinned: boolean;
  position: number;
  hasBack: boolean;
  frontAspect: number;
  backAspect: number | null;
  pdf: CardPdf | null; // null for a photo card
  createdAt: number;
  updatedAt: number;
}

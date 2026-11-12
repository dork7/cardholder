export interface CardFields {
  name: string; // '' when the card has no name
  expiresOn: string | null; // YYYY-MM-DD, local calendar day
  remindDaysBefore: number; // daily reminders start this many days before expiresOn (1..MAX_REMIND_DAYS)
  tags: string[]; // the groups the card is in, free-form, deduplicated ignoring case; [] when there are none
  documentKey: string | null; // hash of the document's own number, for spotting duplicates (src/analysis/documentKey.ts)
  folderId: string | null; // null when the card isn't in a folder
  readText: CardText | null; // what was read off the photos, for search; null until the card has been read
  blurPreview: boolean; // blur pictures in home previews; the opened document stays readable
  vertical: boolean; // an upright card: shown turned on its side in the landscape slots of the home screen
}

// A picture taller than it is wide starts as a vertical card; the user can change it on the edit screen.
// Also the default for cards and backups saved before the setting.
export const looksVertical = (aspect: number): boolean => aspect < 1;

// The text on each side of a card, as card reading found it ('' when nothing was read). Sealed with the
// rest of the card and searched, never shown.
export interface CardText {
  front: string;
  back: string;
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

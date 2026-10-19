export const CATEGORIES = ['id', 'insurance', 'membership', 'loyalty', 'other'] as const;
export type Category = (typeof CATEGORIES)[number];

export interface CardFields {
  name: string;
  category: Category;
  number: string | null;
  notes: string | null;
  expiresOn: string | null; // YYYY-MM-DD, local calendar day
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

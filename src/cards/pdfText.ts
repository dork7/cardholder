import { IMAGE_MAX_EDGE, READ_PDF_MAX_PAGES, READ_TEXT_MAX_LENGTH } from '../config';
import { renderPages } from '../images/pdf';
import { CardImage, PdfDocument } from './types';

type Render = (
  pdf: Pick<PdfDocument, 'pdfBase64' | 'pageCount'>,
  maxEdge: number,
  onPage: (index: number, image: CardImage) => void,
  cancelled: () => boolean,
) => Promise<void>;

// What's printed on a PDF card's pages other than its cover, for search. The cover is the card's
// front and is read as one; the rest are kept as the card's back text, since a PDF card has no back
// photo. Only the first few pages are read: the text kept is capped anyway.
export async function readOtherPages(
  pdf: PdfDocument,
  read: (jpegBase64: string) => Promise<string>,
  render: Render = renderPages,
): Promise<string> {
  const pages: string[] = [];
  await render(
    pdf,
    IMAGE_MAX_EDGE,
    (index, image) => {
      if (index !== pdf.coverPage) pages.push(image.jpegBase64);
    },
    () => pages.length >= READ_PDF_MAX_PAGES,
  );
  const texts: string[] = [];
  for (const page of pages) {
    const text = (await read(page)).trim();
    if (text) texts.push(text);
    if (texts.join('\n').length >= READ_TEXT_MAX_LENGTH) break;
  }
  return texts.join('\n').slice(0, READ_TEXT_MAX_LENGTH);
}

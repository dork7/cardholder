import { requireOptionalNativeModule } from 'expo';
import { getDocumentAsync } from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { CardImage, FrontImage, PdfDocument } from '../cards/types';
import { IMAGE_MAX_EDGE, PDF_MAX_BYTES } from '../config';
import { base64 } from '../crypto/bytes';
import { discardFile, makeThumbnail } from './capture';

interface RenderedPage {
  uri: string;
  pageCount: number;
  width: number;
  height: number;
}

interface CardPdfModule {
  renderPage(uri: string, page: number, maxEdge: number): Promise<RenderedPage>;
  imagesToPdf(jpegUris: string[]): Promise<string>;
}

// modules/card-pdf; missing in builds made before it was added, which then hide the PDF option.
const cardPdf = requireOptionalNativeModule<CardPdfModule>('CardPdf');
export const canPickPdf = cardPdf !== null;

export const isPdfLocked = (e: unknown) => (e as { code?: string }).code === 'E_PDF_LOCKED';

export class PdfTooLargeError extends Error {
  constructor() {
    super('PDF is too large');
    this.name = 'PdfTooLargeError';
  }
}

function renderer(): CardPdfModule {
  if (!cardPdf) throw new Error('PDF rendering is not available in this build');
  return cardPdf;
}

// A PDF from Files, kept whole: nothing is cropped or extracted. Returns null when the user cancels.
// The picked copy is a plaintext temp file, deleted before returning.
export async function pickPdf(): Promise<PdfDocument | null> {
  const pdf = renderer();
  const picked = await getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
  if (picked.canceled) return null;
  const uri = picked.assets[0].uri;
  try {
    const file = new File(uri);
    if ((file.size ?? 0) > PDF_MAX_BYTES) throw new PdfTooLargeError();
    // Opened once here, so a damaged or locked PDF is turned away now rather than saved.
    const first = await pdf.renderPage(uri, 0, 16);
    discardFile(first.uri);
    return { pdfBase64: await file.base64(), pageCount: first.pageCount, coverPage: 0 };
  } finally {
    discardFile(uri);
  }
}

const pdfDir = () => new Directory(Paths.cache, 'pdf');

// The renderer reads files, so a decrypted copy exists only while pages are drawn.
async function withTempPdf<T>(pdfBase64: string, use: (uri: string) => Promise<T>): Promise<T> {
  const dir = pdfDir();
  if (!dir.exists) dir.create({ intermediates: true });
  const file = new File(dir, `${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`);
  file.create({ overwrite: true });
  await file.write(base64.decode(pdfBase64));
  try {
    return await use(file.uri);
  } finally {
    if (file.exists) file.delete();
  }
}

// One page as a JPEG; `keep` gets the file before it is deleted.
async function renderPage<T>(
  pdfUri: string,
  page: number,
  maxEdge: number,
  keep: (image: CardImage, jpegUri: string) => Promise<T>,
): Promise<T> {
  const rendered = await renderer().renderPage(pdfUri, page, maxEdge);
  try {
    const jpegBase64 = await new File(rendered.uri).base64();
    return await keep({ jpegBase64, aspect: rendered.width / rendered.height }, rendered.uri);
  } finally {
    discardFile(rendered.uri);
  }
}

// The cover page, whole and uncropped, as the card's front picture with its thumbnail.
export function renderCover(pdf: PdfDocument): Promise<FrontImage> {
  return withTempPdf(pdf.pdfBase64, (uri) =>
    renderPage(uri, pdf.coverPage, IMAGE_MAX_EDGE, async (image, jpegUri) => ({
      ...image,
      thumbJpegBase64: await makeThumbnail(jpegUri),
    })),
  );
}

// Every page in order, each handed over as soon as it is drawn so the first shows without waiting
// for the rest. Stops early once `cancelled` says so.
export function renderPages(
  pdf: Pick<PdfDocument, 'pdfBase64' | 'pageCount'>,
  maxEdge: number,
  onPage: (index: number, image: CardImage) => void,
  cancelled: () => boolean = () => false,
): Promise<void> {
  return withTempPdf(pdf.pdfBase64, async (uri) => {
    for (let page = 0; page < pdf.pageCount && !cancelled(); page++) {
      const image = await renderPage(uri, page, maxEdge, async (img) => img);
      if (!cancelled()) onPage(page, image);
    }
  });
}

// JPEG files → one PDF with a page each, in the cache folder; null in builds without the PDF module.
// The caller deletes it.
export function imagesToPdf(jpegUris: string[]): Promise<string> | null {
  return cardPdf ? cardPdf.imagesToPdf(jpegUris) : null;
}

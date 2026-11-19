import { fieldsOf } from './batch';
import { CardStore } from './cardStore';
import { Card, PdfDocument } from './types';

// `read` turns a photo into its text ('' when nothing is found).
export type ReadPhoto = (jpegBase64: string) => Promise<string>;
export type ReadPdfPages = (pdf: PdfDocument, onPage: (index: number, jpegBase64: string) => Promise<void>,
  cancelled?: () => boolean) => Promise<void>;

const renderAndReadPdf: ReadPdfPages = async (pdf, onPage, cancelled) => {
  const { renderPages } = await import('../images/pdf');
  const { IMAGE_MAX_EDGE } = await import('../config');
  await renderPages(pdf, IMAGE_MAX_EDGE, (index, image) => onPage(index, image.jpegBase64), cancelled);
};

// Reads a card's text again from its saved photos or every PDF page and
// saves it, which is what its Details (.md) are made from. Returns false when the card was edited or
// deleted while it was being read: the user's change wins, nothing is written.
export async function rereadCard(store: CardStore, card: Card, read: ReadPhoto,
  readPdfPages: ReadPdfPages = renderAndReadPdf): Promise<boolean> {
  let readText;
  if (card.pdf) {
    const pdfBase64 = await store.loadPdf(card.id);
    if (!pdfBase64) return false;
    const pages = Array<string>(card.pdf.pageCount).fill('');
    let interrupted = false;
    await readPdfPages({ ...card.pdf, pdfBase64 }, async (index, jpeg) => {
      pages[index] = await read(jpeg);
      const current = await store.get(card.id);
      interrupted = !current || current.updatedAt !== card.updatedAt;
    }, () => interrupted);
    if (interrupted) return false;
    readText = { front: pages[card.pdf.coverPage] ?? '', back: card.hasBack ? pages[1] ?? '' : '', pages };
  } else {
    const front = await store.loadImage(card.id, 'front');
    const back = card.hasBack ? await store.loadImage(card.id, 'back') : null;
    readText = { front: front ? await read(front) : '', back: back ? await read(back) : '' };
  }
  const fresh = await store.get(card.id);
  if (!fresh || fresh.updatedAt !== card.updatedAt) return false;
  await store.update(card.id, { ...fieldsOf(fresh), readText });
  return true;
}

// New PDFs become searchable without waiting for the next app launch. This runs after the encrypted
// document is saved, and refreshes Home only if the document was still current when reading finished.
export async function indexPdfAfterSave(store: CardStore, card: Card, read: ReadPhoto,
  refresh: () => Promise<unknown>, readPdfPages?: ReadPdfPages): Promise<void> {
  if (card.pdf && await rereadCard(store, card, read, readPdfPages)) await refresh();
}

// "Recreate .md" on several documents picked in the gallery: each is read on its own, so one failure
// doesn't stop the rest. Returns how many failed.
export async function rereadCards(
  store: CardStore,
  cards: readonly Card[],
  read: ReadPhoto,
  onEach?: (done: number) => void,
  readPdfPages?: ReadPdfPages,
): Promise<number> {
  let failed = 0;
  for (const [i, card] of cards.entries()) {
    try {
      if (!(await rereadCard(store, card, read, readPdfPages))) failed++;
    } catch (e) {
      console.warn('Reading a document again failed', e);
      failed++;
    }
    onEach?.(i + 1);
  }
  return failed;
}

// Cards saved before Doc Keeper kept the text read off them can't be found by it. Each is read once,
// in the background after the app opens, from its saved photos. Returns how many cards were updated.
export async function readUnreadCards(store: CardStore, read: ReadPhoto, readPdfPages?: ReadPdfPages): Promise<number> {
  let updated = 0;
  for (const card of await store.list()) {
    if (card.readText !== null && (!card.pdf || card.readText.pages?.length === card.pdf.pageCount)) continue;
    try {
      // Reading takes a while; if the user edited the card meanwhile, leave it for the next launch
      // rather than write over their change.
      if (await rereadCard(store, card, read, readPdfPages)) updated++;
    } catch (e) {
      console.warn('Reading a saved card failed', e);
    }
  }
  return updated;
}

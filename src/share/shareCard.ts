import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { CardStore, loadPhotos } from '../cards/cardStore';
import { displayName } from '../cards/display';
import { Card } from '../cards/types';
import { base64 } from '../crypto/bytes';
import { IMAGE_MAX_EDGE } from '../config';
import { imagesToPdf, renderPages } from '../images/pdf';
import { toIsoDate } from '../time/dates';

const shareDir = () => new Directory(Paths.cache, 'share');

// The share sheet needs a file on disk, so a decrypted copy lives here only while it is open.
export function clearShareCache(): void {
  const dir = shareDir();
  if (dir.exists) dir.delete();
}

// "Gym card!" -> "Gym card"; anything that could form a path is dropped.
export function cardFileBase(card: Pick<Card, 'name' | 'category'>): string {
  return displayName(card).replace(/[^\p{L}\p{N} _-]/gu, '').trim() || 'card';
}

const JPEG = { mimeType: 'image/jpeg', UTI: 'public.jpeg' };
const PDF = { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' };

async function writeShareFile(name: string, base64Data: string): Promise<File> {
  const file = new File(shareDir(), name);
  file.create({ overwrite: true });
  await file.write(base64.decode(base64Data));
  return file;
}

// Quick share: the system share sheet, which offers AirDrop on iPhone and Quick Share on Android
// (Bluetooth and Wi-Fi, no internet) as well as any other app. The whole card goes as one file: a
// PDF card as its PDF, a card with a back as a two-page PDF, a front-only card as its photo.
// Resolves once the share sheet is closed.
export async function shareCard(store: CardStore, card: Card): Promise<void> {
  clearShareCache();
  shareDir().create({ intermediates: true });
  const base = cardFileBase(card);
  try {
    const pdf = card.pdf ? await store.loadPdf(card.id) : null;
    if (pdf) {
      await Sharing.shareAsync((await writeShareFile(`${base}.pdf`, pdf)).uri, PDF);
      return;
    }
    const { front, back } = await loadPhotos(store, card);
    if (!front) return;
    const frontFile = await writeShareFile(`${base}-front.jpg`, front);
    const combined = back ? imagesToPdf([frontFile.uri, (await writeShareFile(`${base}-back.jpg`, back)).uri]) : null;
    if (combined) {
      await shareMadePdf(combined, `${base}.pdf`);
      return;
    }
    // No back, or a build without the PDF module: the front photo alone.
    await Sharing.shareAsync(frontFile.uri, JPEG);
  } finally {
    clearShareCache();
  }
}

// Names the PDF imagesToPdf made, shares it, and deletes it once the share sheet closes.
async function shareMadePdf(made: Promise<string>, name: string): Promise<void> {
  const file = new File(await made);
  try {
    await file.move(new File(shareDir(), name), { overwrite: true });
    await Sharing.shareAsync(file.uri, PDF);
  } finally {
    if (file.exists) file.delete();
  }
}

export class PdfUnavailableError extends Error {}

// Several cards as one PDF, in the order given: each photo card's front then back, and every page of a
// PDF card. Like shareCard, the copies are deleted once the share sheet closes. A single PDF card, or
// one with a back, goes as shareCard sends it (already one PDF, and a PDF card's own file keeps its
// text); a single front-only card is still a PDF here, named for the card.
export async function shareCards(store: CardStore, cards: Card[]): Promise<void> {
  if (cards.length === 1 && (cards[0].pdf || cards[0].hasBack)) return shareCard(store, cards[0]);
  clearShareCache();
  shareDir().create({ intermediates: true });
  try {
    const pages: string[] = [];
    const addPage = async (jpegBase64: string) => {
      pages.push((await writeShareFile(`page-${pages.length + 1}.jpg`, jpegBase64)).uri);
    };
    for (const card of cards) {
      const pdf = card.pdf ? await store.loadPdf(card.id) : null;
      if (card.pdf && pdf) {
        const drawn: string[] = [];
        await renderPages({ pdfBase64: pdf, pageCount: card.pdf.pageCount }, IMAGE_MAX_EDGE, (i, page) => {
          drawn[i] = page.jpegBase64;
        });
        for (const page of drawn) await addPage(page);
        continue;
      }
      const { front, back } = await loadPhotos(store, card);
      if (front) await addPage(front);
      if (back) await addPage(back);
    }
    if (pages.length === 0) return;
    const combined = imagesToPdf(pages);
    if (!combined) throw new PdfUnavailableError('This build cannot make PDFs');
    const name = cards.length === 1 ? `${cardFileBase(cards[0])}.pdf` : `DocKeeper-${cards.length}-cards.pdf`;
    await shareMadePdf(combined, name);
  } finally {
    clearShareCache();
  }
}

// Local date, so a backup made late in the evening is named for the day the user sees.
export function backupFileName(date: Date): string {
  return `DocKeeper-backup-${toIsoDate(date)}.cardholder`;
}

// Shares an encrypted backup file. Resolves once the share sheet is closed; the OS doesn't say
// whether the file was saved or the sheet was dismissed.
export async function shareBackupFile(bytes: Uint8Array, date: Date): Promise<void> {
  clearShareCache();
  const dir = shareDir();
  dir.create({ intermediates: true });
  const file = new File(dir, backupFileName(date));
  file.create({ overwrite: true });
  await file.write(bytes);
  try {
    await Sharing.shareAsync(file.uri, { mimeType: 'application/octet-stream', UTI: 'public.data' });
  } finally {
    clearShareCache();
  }
}

import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { CardStore } from '../cards/cardStore';
import { displayName } from '../cards/display';
import { Card } from '../cards/types';
import { base64, utf8 } from '../crypto/bytes';
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
    const front = await store.loadImage(card.id, 'front');
    if (!front) return;
    const frontFile = await writeShareFile(`${base}-front.jpg`, front);
    const back = card.hasBack ? await store.loadImage(card.id, 'back') : null;
    const combined = back ? imagesToPdf([frontFile.uri, (await writeShareFile(`${base}-back.jpg`, back)).uri]) : null;
    if (combined) {
      const made = new File(await combined);
      try {
        await made.move(new File(shareDir(), `${base}.pdf`), { overwrite: true });
        await Sharing.shareAsync(made.uri, PDF);
      } finally {
        if (made.exists) made.delete();
      }
      return;
    }
    // No back, or a build without the PDF module: the front photo alone.
    await Sharing.shareAsync(frontFile.uri, JPEG);
  } finally {
    clearShareCache();
  }
}

// The card's details and scanned text as a Markdown file (see cardMarkdown), named after the card.
export function shareCardMarkdown(card: Card, markdown: string): Promise<void> {
  return shareMarkdown(cardFileBase(card), markdown);
}

// Any Markdown text as `<baseName>.md` through the share sheet; the copy is removed afterwards.
export async function shareMarkdown(baseName: string, markdown: string): Promise<void> {
  clearShareCache();
  shareDir().create({ intermediates: true });
  try {
    const file = new File(shareDir(), `${baseName}.md`);
    file.create({ overwrite: true });
    await file.write(utf8.encode(markdown));
    await Sharing.shareAsync(file.uri, { mimeType: 'text/markdown', UTI: 'net.daringfireball.markdown' });
  } finally {
    clearShareCache();
  }
}

export class PdfUnavailableError extends Error {}

// "Gym.pdf" in a folder already holding it -> "Gym (2).pdf", so saving again never replaces a file.
export function freeFileName(name: string, taken: ReadonlySet<string>): string {
  if (!taken.has(name)) return name;
  const dot = name.lastIndexOf('.');
  const [stem, ext] = dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ''];
  for (let n = 2; ; n++) {
    const next = `${stem} (${n})${ext}`;
    if (!taken.has(next)) return next;
  }
}

// The whole card as one PDF in the share folder: a PDF card as its own PDF, a photo card as its
// front then its back. Unlike shareCard, a front-only card is a PDF too. Null when nothing is stored.
async function writeCardPdf(store: CardStore, card: Card): Promise<File | null> {
  const base = cardFileBase(card);
  if (card.pdf) {
    const pdf = await store.loadPdf(card.id);
    return pdf ? writeShareFile(`${base}.pdf`, pdf) : null;
  }
  const front = await store.loadImage(card.id, 'front');
  if (!front) return null;
  const pages = [(await writeShareFile(`${base}-front.jpg`, front)).uri];
  const back = card.hasBack ? await store.loadImage(card.id, 'back') : null;
  if (back) pages.push((await writeShareFile(`${base}-back.jpg`, back)).uri);
  const combined = imagesToPdf(pages);
  if (!combined) throw new PdfUnavailableError('This build cannot make PDFs');
  const made = new File(await combined);
  try {
    await made.move(new File(shareDir(), `${base}.pdf`), { overwrite: true });
  } catch (e) {
    if (made.exists) made.delete();
    throw e;
  }
  return made;
}

const isCancelled = (e: unknown) => /cancel/i.test(`${(e as { code?: string })?.code ?? ''} ${(e as Error)?.message ?? ''}`);

// The card as a PDF, either sent through the share sheet or saved into a folder the user picks
// (Files on iPhone, the system folder picker on Android). Resolves to the saved file's name, or null
// when it was sent, the picker was cancelled or there was nothing to export. The decrypted copy in
// the cache is always removed; only the copy the user chose to save stays.
export async function exportCardPdf(store: CardStore, card: Card, to: 'send' | 'files'): Promise<string | null> {
  clearShareCache();
  shareDir().create({ intermediates: true });
  try {
    const pdf = await writeCardPdf(store, card);
    if (!pdf) return null;
    if (to === 'send') {
      await Sharing.shareAsync(pdf.uri, PDF);
      return null;
    }
    let folder: Directory;
    try {
      folder = await Directory.pickDirectoryAsync();
    } catch (e) {
      if (isCancelled(e)) return null;
      throw e;
    }
    const name = freeFileName(pdf.name, new Set(folder.list().map((entry) => entry.name)));
    const saved = folder.createFile(name, PDF.mimeType);
    await saved.write(await pdf.bytes());
    return saved.name;
  } finally {
    clearShareCache();
  }
}

// Several cards as one PDF, in the order given: each photo card's front then back, and every page of a
// PDF card. Like shareCard, the copies are deleted once the share sheet closes. A single card is shared
// as shareCard would.
export async function shareCards(store: CardStore, cards: Card[]): Promise<void> {
  if (cards.length === 1) return shareCard(store, cards[0]);
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
      const front = await store.loadImage(card.id, 'front');
      if (front) await addPage(front);
      const back = card.hasBack ? await store.loadImage(card.id, 'back') : null;
      if (back) await addPage(back);
    }
    if (pages.length === 0) return;
    const combined = imagesToPdf(pages);
    if (!combined) throw new PdfUnavailableError('This build cannot make PDFs');
    const made = new File(await combined);
    try {
      await made.move(new File(shareDir(), `DocKeeper-${cards.length}-cards.pdf`), { overwrite: true });
      await Sharing.shareAsync(made.uri, PDF);
    } finally {
      if (made.exists) made.delete();
    }
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

import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { CardStore } from '../cards/cardStore';
import { displayName } from '../cards/display';
import { Card } from '../cards/types';
import { base64 } from '../crypto/bytes';
import { imagesToPdf } from '../images/pdf';
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
        made.move(new File(shareDir(), `${base}.pdf`), { overwrite: true });
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

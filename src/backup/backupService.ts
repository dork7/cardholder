import { CardStore } from '../cards/cardStore';
import { BackupCard, BackupSnapshot } from './backupFile';

export type ImportMode = 'merge' | 'replace';

export interface ImportResult {
  added: number;
  skipped: number;
}

export async function buildSnapshot(store: CardStore, now: number): Promise<BackupSnapshot> {
  const cards: BackupCard[] = [];
  for (const card of await store.list()) {
    const front = await store.loadImage(card.id, 'front');
    if (!front) throw new Error(`Card ${card.id} has no front image`);
    const thumb = (await store.loadImage(card.id, 'thumb')) ?? front;
    const back = card.hasBack && card.backAspect ? await store.loadImage(card.id, 'back') : null;
    // A PDF whose file has gone is kept as a photo card of its cover page.
    const pdf = card.pdf ? await store.loadPdf(card.id) : null;
    cards.push({
      card: { ...card, hasBack: back !== null, backAspect: back ? card.backAspect : null, pdf: pdf ? card.pdf : null },
      images: {
        front: { jpegBase64: front, aspect: card.frontAspect, thumbJpegBase64: thumb },
        back: back && card.backAspect ? { jpegBase64: back, aspect: card.backAspect } : null,
        pdf: pdf && card.pdf ? { ...card.pdf, pdfBase64: pdf } : null,
      },
    });
  }
  return { formatVersion: 1, exportedAt: now, cards, folders: await store.listFolders() };
}

// The snapshot must come from decodeBackup, which has already validated every card.
export async function applySnapshot(store: CardStore, snapshot: BackupSnapshot, mode: ImportMode): Promise<ImportResult> {
  if (mode === 'replace') {
    await store.insertMany(snapshot.cards, { replace: true, folders: snapshot.folders });
    return { added: snapshot.cards.length, skipped: 0 };
  }
  const existing = new Set(await store.ids());
  const fresh = snapshot.cards.filter((entry) => !existing.has(entry.card.id));
  if (fresh.length > 0 || snapshot.folders.length > 0) {
    await store.insertMany(fresh, { replace: false, folders: snapshot.folders });
  }
  return { added: fresh.length, skipped: snapshot.cards.length - fresh.length };
}

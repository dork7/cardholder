import { CardStore } from '../cards/cardStore';
import { BACKUP_SNOOZE_MS, BACKUP_STALE_MS } from '../config';
import { Settings } from '../storage/settings';

export interface NudgeInput {
  cardCount: number;
  lastChangeAt: number | null;
  lastExportAt: number | null;
  snoozedUntil: number | null;
  now: number;
}

export function shouldNudgeBackup(input: NudgeInput): boolean {
  const { cardCount, lastChangeAt, lastExportAt, snoozedUntil, now } = input;
  if (cardCount === 0) return false;
  if (snoozedUntil !== null && now < snoozedUntil) return false;
  if (lastExportAt === null) return true;
  const changedSinceExport = lastChangeAt !== null && lastChangeAt > lastExportAt;
  return changedSinceExport && now - lastExportAt > BACKUP_STALE_MS;
}

export async function readNudgeInput(store: CardStore, settings: Settings, now: number): Promise<NudgeInput> {
  return {
    cardCount: await store.count(),
    lastChangeAt: await store.lastChangeAt(),
    lastExportAt: await settings.getNumber('lastExportAt'),
    snoozedUntil: await settings.getNumber('backupSnoozedUntil'),
    now,
  };
}

export async function snoozeBackupNudge(settings: Settings, now: number): Promise<void> {
  await settings.set('backupSnoozedUntil', String(now + BACKUP_SNOOZE_MS));
}

export async function recordExport(settings: Settings, at: number): Promise<void> {
  await settings.set('lastExportAt', String(at));
  await settings.remove('backupSnoozedUntil');
}

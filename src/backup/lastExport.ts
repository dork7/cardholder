import { Settings } from '../storage/settings';

// Settings shows when the last backup was made.
export async function recordExport(settings: Settings, at: number): Promise<void> {
  await settings.set('lastExportAt', String(at));
}

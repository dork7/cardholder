import { Folder } from '../cards/types';
import { FOLDER_NAME_MAX_LENGTH } from '../config';

export type FolderNameError = 'blank' | 'too-long' | 'duplicate';

// Checks a name typed for a new or renamed folder. Names are compared ignoring case and accents, so
// "Family" and "family" can't both exist.
export function checkFolderName(name: string, folders: Folder[], renamingId?: string): FolderNameError | null {
  const trimmed = name.trim();
  if (trimmed === '') return 'blank';
  if ([...trimmed].length > FOLDER_NAME_MAX_LENGTH) return 'too-long';
  const taken = folders.some(
    (f) => f.id !== renamingId && f.name.localeCompare(trimmed, 'en', { sensitivity: 'base' }) === 0,
  );
  return taken ? 'duplicate' : null;
}

export const findFolderNamed = (folders: Folder[], name: string) =>
  folders.find((f) => f.name.localeCompare(name.trim(), 'en', { sensitivity: 'base' }) === 0);

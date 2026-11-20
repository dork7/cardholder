import { Card, Folder } from './types';
import { normalizeTags } from './tags';

// Legacy folder names become tags. Existing same-name tags keep their spelling; a document at the
// normal eight-tag limit may temporarily carry a ninth migrated tag so no grouping is lost.
export function convertFolderToTag<C extends Card>(card: C, folders: readonly Folder[]): C {
  if (!card.folderId) return card;
  const folder = folders.find((candidate) => candidate.id === card.folderId);
  if (!folder) throw new Error(`Missing folder for document ${card.id}`);
  return { ...card, tags: normalizeTags([...card.tags, folder.name]), folderId: null };
}

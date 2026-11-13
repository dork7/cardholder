// Files shared to Doc Keeper from another app's share sheet (Photos, Files, a chat). One or two
// photos become a new document's front and back; one PDF becomes a PDF document.

export interface SharedFile {
  path: string;
  mimeType: string;
  fileName?: string;
}

export type SharedIn = { kind: 'photos'; paths: string[] } | { kind: 'pdf'; path: string };

const isPdf = (f: SharedFile) => f.mimeType === 'application/pdf' || /\.pdf$/i.test(f.fileName ?? f.path);
const isImage = (f: SharedFile) => f.mimeType.startsWith('image/');

// What to make of what was shared; null when it isn't something a document can be made from (three
// or more photos, a PDF with anything else, another kind of file).
export function planShared(files: readonly SharedFile[]): SharedIn | null {
  if (files.length === 1 && isPdf(files[0])) return { kind: 'pdf', path: files[0].path };
  if (files.length >= 1 && files.length <= 2 && files.every(isImage)) return { kind: 'photos', paths: files.map((f) => f.path) };
  return null;
}

// Handed from the receiver to the New document screen it opens, which takes it once.
let pending: SharedIn | null = null;

export function setPendingShared(shared: SharedIn): void {
  pending = shared;
}

export function takePendingShared(): SharedIn | null {
  const shared = pending;
  pending = null;
  return shared;
}

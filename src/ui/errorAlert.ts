import { Alert } from 'react-native';
import { PdfUnavailableError } from '../share/pdfUnavailable';
import { strings } from '../strings';

export type ErrorAction = keyof typeof strings.errors.actions;

// SQLite says "database or disk is full" (SQLITE_FULL); file writes fail with ENOSPC.
const STORAGE_FULL = /SQLITE_FULL|database or disk is full|ENOSPC|no space left/i;

const isStorageFull = (e: unknown) => e instanceof Error && STORAGE_FULL.test(e.message);

// What failed (title) and what to try (body). Where the error tells the cause, the body says so.
export function errorMessage(action: ErrorAction, e: unknown): { title: string; body: string } {
  const message: { title: string; body: string; pdfUnavailable?: string } = strings.errors.actions[action];
  let body = message.body;
  if (isStorageFull(e)) body = strings.errors.storageFull;
  else if (e instanceof PdfUnavailableError && message.pdfUnavailable) body = message.pdfUnavailable;
  return { title: message.title, body };
}

export function showError(action: ErrorAction, e: unknown): void {
  const { title, body } = errorMessage(action, e);
  Alert.alert(title, body);
}

import { toHex } from '../crypto/bytes';
import { engine } from '../crypto/engine';
import { EMIRATES_ID } from './fields';
import { Mrz } from './mrz';
import { normalizeDigits } from './smartExtract';

// What identifies the document itself, so a renewed card can be matched to the old one. An Emirates ID
// number stays the same across renewals and is printed on the front and inside the back's MRZ; other
// documents fall back to their MRZ document number.
export function documentId(text: string, mrz: Mrz | null): string | null {
  const printed = EMIRATES_ID.exec(normalizeDigits(text));
  if (printed) return `AE-ID:${printed[0].replace(/\D/g, '')}`;
  const inMrz = /^784\d{12}/.exec(mrz?.optionalData ?? '');
  if (inMrz) return `AE-ID:${inMrz[0]}`;
  if (mrz?.documentNumber) return `MRZ:${mrz.documentCode[0]}:${mrz.documentNumber}`;
  return null;
}

// Only this hash is kept (inside the encrypted card): enough to spot a duplicate, without the app
// storing the number itself.
export function documentKey(id: string): string {
  return toHex(engine.createHash('sha256').update(`cardholder-document:${id}`).digest());
}

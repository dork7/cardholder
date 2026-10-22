import { isValidIsoDate } from '../time/dates';

// The machine-readable zone (ICAO 9303) on ID cards (TD1: 3 lines × 30) and passports (TD3: 2 × 44).
// Its check digits let a read be verified, so it is the most trustworthy source on a card.

export interface Mrz {
  format: 'td1' | 'td3';
  documentCode: string; // e.g. "ID", "IL", "P<"
  expiresOn: string | null; // YYYY-MM-DD, only when its check digit is right
}

const charValue = (c: string): number => {
  if (c >= '0' && c <= '9') return c.charCodeAt(0) - 48;
  if (c >= 'A' && c <= 'Z') return c.charCodeAt(0) - 55;
  return 0; // '<'
};

export function checkDigit(field: string): number {
  const weights = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < field.length; i++) sum += charValue(field[i]) * weights[i % 3];
  return sum % 10;
}

const checks = (field: string, digit: string) => /^\d$/.test(digit) && checkDigit(field) === Number(digit);

// OCR reads the filler "<" as « or K-like shapes and splits lines with spaces.
function clean(line: string): string {
  return line.toUpperCase().replace(/[«‹]/g, '<').replace(/\s+/g, '');
}

const isMrzLine = (s: string) => s.length >= 25 && s.length <= 46 && /^[A-Z0-9<]+$/.test(s) && s.includes('<');

function expiry(yymmdd: string, digit: string): string | null {
  if (!checks(yymmdd, digit)) return null;
  // Documents valid today expire this century.
  const iso = `20${yymmdd.slice(0, 2)}-${yymmdd.slice(2, 4)}-${yymmdd.slice(4, 6)}`;
  return isValidIsoDate(iso) ? iso : null;
}

export function findMrz(lines: string[]): Mrz | null {
  const cleaned = lines.map(clean);
  for (let i = 0; i < cleaned.length; i++) {
    // TD3: two lines of 44, the first starting with "P".
    if (cleaned[i].startsWith('P') && isMrzLine(cleaned[i]) && isMrzLine(cleaned[i + 1] ?? '')) {
      const l2 = cleaned[i + 1].padEnd(44, '<');
      if (cleaned[i].length >= 40 && checks(l2.slice(0, 9), l2[9])) {
        return { format: 'td3', documentCode: cleaned[i].slice(0, 2), expiresOn: expiry(l2.slice(21, 27), l2[27]) };
      }
    }
    // TD1: three lines of 30; only the first two hold the fields used here. Trailing filler is often
    // dropped by OCR, so pad.
    const td1Line = (s: string | undefined) => s !== undefined && isMrzLine(s) && s.length <= 32;
    if (td1Line(cleaned[i]) && td1Line(cleaned[i + 1])) {
      const l1 = cleaned[i].padEnd(30, '<');
      const l2 = cleaned[i + 1].padEnd(30, '<');
      const docOk = checks(l1.slice(5, 14), l1[14]);
      const expiresOn = expiry(l2.slice(8, 14), l2[14]);
      if (docOk || expiresOn) return { format: 'td1', documentCode: l1.slice(0, 2), expiresOn };
    }
  }
  return null;
}

import { analyzeText } from '../analyze';
import { detectDocumentType, suggestedTag } from '../documentType';
import { findMrz } from '../mrz';
import { OcrResult } from '../types';

const type = (text: string) => detectDocumentType(text, null)?.value;

describe('the document type, from its main text', () => {
  test('a residence visa is Residency, in English or Arabic', () => {
    expect(type('UNITED ARAB EMIRATES\nRESIDENCE\nPassport No. N1234567\nProfession: Engineer')).toBe('Residency');
    expect(type('Residency Permit')).toBe('Residency');
    expect(type('إقامة')).toBe('Residency');
  });

  test('the more specific title wins', () => {
    // An Emirates ID says "Resident Identity Card"; its number settles it.
    expect(type('Resident Identity Card\n784-1990-1234567-1')).toBe('Emirates ID');
    // A driving licence that also mentions the holder's passport.
    expect(type('Driving License\nPassport No. 123')).toBe('Driving License');
  });

  test('common UAE documents', () => {
    expect(type('Vehicle License\nTraffic Plate No')).toBe('Vehicle License');
    expect(type('رخصة قيادة')).toBe('Driving License');
    expect(type('Work Permit\nMinistry of Human Resources')).toBe('Work Permit');
    expect(type('ENTRY PERMIT\nTourist')).toBe('Visa');
    expect(type('Passport\nRepublic of Utopia')).toBe('Passport');
    expect(type('Tenancy Contract\nEjari')).toBe('Tenancy Contract');
    expect(type('Vehicle Rental Agreement')).toBe('Rental Contract');
    expect(type('Birth Certificate')).toBe('Birth Certificate');
  });

  test('a passport is known by its MRZ even without the word', () => {
    const mrz = findMrz(['P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<', 'L898902C36UTO7408122F1204159ZE184226B<<<<<10']);
    expect(detectDocumentType('UTOPIA', mrz)?.value).toBe('Passport');
  });

  test('nothing for a card that names no document, or only a card brand', () => {
    expect(type('Fitness First\nMember since 2020')).toBeUndefined();
    expect(type('VISA\nPlatinum')).toBeUndefined();
    expect(type('Passport No. N1234567')).toBeUndefined(); // only a field label
  });

  test('read with the rest of the card', () => {
    const ocr: OcrResult = {
      lines: ['UNITED ARAB EMIRATES', 'RESIDENCE', 'Name: Anna Maria'].map((text, i) => ({
        text,
        confidence: 0.95,
        box: { x: 0.05, y: i * 0.1, width: 0.8, height: 0.05 },
      })),
    };
    expect(analyzeText(ocr, '2026-10-22').documentType).toEqual({ value: 'Residency', confidence: 0.85 });
  });
});

describe('the tag suggested', () => {
  const residency = { value: 'Residency', confidence: 0.85 };
  const id = { value: 'id' as const, confidence: 0.9 };

  test("is the document's type, as a new tag when the user has none by that name", () => {
    expect(suggestedTag({ documentType: residency, category: id }, ['ID'])).toEqual({ value: ['Residency'], confidence: 0.85 });
  });

  test('reuses a tag the user already has, whatever its case', () => {
    expect(suggestedTag({ documentType: residency }, ['ID', 'residency'])).toEqual({ value: ['residency'], confidence: 0.85 });
  });

  test("without a type, the broad kind's tag, spelled as the user already has it", () => {
    expect(suggestedTag({ category: id }, [])).toEqual({ value: ['ID'], confidence: 0.9 });
    expect(suggestedTag({ category: id }, ['Id'])).toEqual({ value: ['Id'], confidence: 0.9 });
    expect(suggestedTag({ category: { value: 'insurance', confidence: 0.7 } }, [])).toEqual({ value: ['Insurance'], confidence: 0.7 });
  });

  test('Other, or nothing read, suggests no tag', () => {
    expect(suggestedTag({ category: { value: 'other', confidence: 0.6 } }, ['ID'])).toBeUndefined();
    expect(suggestedTag({}, ['ID'])).toBeUndefined();
  });
});

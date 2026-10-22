import { analyzeImage, analyzeText } from '../analyze';
import { checkDigit, findMrz } from '../mrz';
import { OcrLine, OcrResult } from '../types';

const TODAY = '2026-10-22';

// Lines top to bottom; `big` lines are printed larger, like a card's title.
function ocr(lines: (string | { text: string; big: true })[]): OcrResult {
  return {
    lines: lines.map((l, i): OcrLine => {
      const text = typeof l === 'string' ? l : l.text;
      const height = typeof l === 'string' ? 0.05 : 0.12;
      return { text, confidence: 0.95, box: { x: 0.05, y: i * 0.1, width: 0.8, height } };
    }),
  };
}

// ICAO 9303 specimen documents.
const TD1 = ['I<UTOD231458907<<<<<<<<<<<<<<<', '7408122F1204159UTO<<<<<<<<<<<6', 'ERIKSSON<<ANNA<MARIA<<<<<<<<<<'];
const TD3 = ['P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<', 'L898902C36UTO7408122F1204159ZE184226B<<<<<10'];

describe('MRZ', () => {
  test('check digits follow ICAO 9303 (weights 7, 3, 1)', () => {
    expect(checkDigit('D23145890')).toBe(7);
    expect(checkDigit('120415')).toBe(9);
  });

  test('reads an ID card (TD1) and a passport (TD3), expiry included', () => {
    expect(findMrz(TD1)).toEqual({ format: 'td1', documentCode: 'I<', expiresOn: '2012-04-15' });
    expect(findMrz(TD3)).toEqual({ format: 'td3', documentCode: 'P<', expiresOn: '2012-04-15' });
  });

  test('copes with OCR spacing, « for <, and dropped trailing filler', () => {
    const messy = ['I<UTO D23145890 7<<<<<<<<<<<', '7408122F1204159UTO«««««««««««6', 'ERIKSSON<<ANNA<MARIA'];
    expect(findMrz(messy)?.expiresOn).toBe('2012-04-15');
  });

  test('a misread expiry fails its check digit and is not used', () => {
    const misread = [TD1[0], '7408122F1204189UTO<<<<<<<<<<<6', TD1[2]];
    expect(findMrz(misread)).toEqual({ format: 'td1', documentCode: 'I<', expiresOn: null });
  });

  test('ordinary text is not an MRZ', () => {
    expect(findMrz(['FITNESS FIRST', 'MEMBER', 'JOHN SMITH'])).toBeNull();
  });
});

describe('reading a card', () => {
  test('an Emirates ID: name, labelled expiry (day first), category', () => {
    const result = analyzeText(
      ocr([
        'UNITED ARAB EMIRATES',
        'RESIDENT IDENTITY CARD',
        'ID Number 784-1987-7654321-4',
        'Name: Omar Khalid',
        'Date of Birth 03/05/1987',
        'Expiry Date 09/11/2030',
      ]),
      TODAY,
    );
    expect(result.name).toEqual({ value: 'Emirates ID', confidence: 0.9 });
    expect(result.expiresOn).toEqual({ value: '2030-11-09', confidence: 0.85 });
    expect(result.category?.value).toBe('id');
  });

  test('the back of an ID: the MRZ expiry wins and the category is certain', () => {
    expect(analyzeText(ocr(TD1), TODAY)).toMatchObject({
      expiresOn: { value: '2012-04-15', confidence: 0.95 },
      category: { value: 'id', confidence: 0.95 },
    });
  });

  test('a passport is named Passport', () => {
    expect(analyzeText(ocr(TD3), TODAY).name?.value).toBe('Passport');
  });

  test('an insurance card: the insurer is the name, "Member Name" does not make it a membership', () => {
    const result = analyzeText(
      ocr([
        { text: 'DAMAN', big: true },
        'National Health Insurance Company',
        'Member Name: LAYLA HASSAN',
        'Policy No. 1100 2345 6789',
        'Valid Until: 31-12-2027',
      ]),
      TODAY,
    );
    expect(result.name?.value).toBe('Daman');
    expect(result.expiresOn?.value).toBe('2027-12-31');
    expect(result.category?.value).toBe('insurance');
  });

  test('a gym card with no expiry: brand name and membership, no expiry guessed', () => {
    const result = analyzeText(ocr([{ text: 'FITNESS FIRST', big: true }, 'MEMBER', 'JOHN SMITH', 'Member No. 00451278']), TODAY);
    expect(result.name?.value).toBe('Fitness First');
    expect(result.category?.value).toBe('membership');
    expect(result.expiresOn).toBeUndefined();
  });

  test('a label on one line and its date on the next', () => {
    expect(analyzeText(ocr(['GOLD CLUB', 'Expires', '06/2028']), TODAY).expiresOn?.value).toBe('2028-06-30');
  });

  test('without a label, only a future date is taken, and as a weaker guess', () => {
    const result = analyzeText(ocr(['LIBRARY CARD', 'Issued 01/02/2020', '15/08/2029']), TODAY);
    expect(result.expiresOn).toEqual({ value: '2029-08-15', confidence: 0.6 });
  });

  test('Arabic-Indic digits are read as digits', () => {
    expect(analyzeText(ocr(['Expiry ١٤/٠٣/٢٠٢٨']), TODAY).expiresOn?.value).toBe('2028-03-14');
  });

  test('a card with no useful text suggests nothing', () => {
    expect(analyzeText(ocr(['1234 5678', '***']), TODAY)).toEqual({
      name: undefined,
      expiresOn: undefined,
      category: undefined,
    });
  });

  test('lines OCR is unsure of are ignored', () => {
    const shaky: OcrResult = { lines: [{ ...ocr(['Expiry 01/01/2030']).lines[0], confidence: 0.1 }] };
    expect(analyzeText(shaky, TODAY).expiresOn).toBeUndefined();
  });
});

describe('analyzeImage', () => {
  test('runs the recognizer on the photo it is given', async () => {
    const recognize = jest.fn(async () => ocr(['GOLD CLUB', 'Valid thru 12/2029']));
    const result = await analyzeImage('JPEG', { recognizer: { recognize }, today: TODAY });
    expect(recognize).toHaveBeenCalledWith('JPEG');
    expect(result.expiresOn?.value).toBe('2029-12-31');
  });

  test('gives up on a recognizer that takes too long', async () => {
    const recognize = () => new Promise<OcrResult>(() => {});
    await expect(analyzeImage('JPEG', { recognizer: { recognize }, timeoutMs: 10 })).rejects.toThrow('timed out');
  });
});

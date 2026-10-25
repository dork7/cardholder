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
    expect(findMrz(TD1)).toEqual({
      format: 'td1',
      documentCode: 'I<',
      expiresOn: '2012-04-15',
      documentNumber: 'D23145890',
      optionalData: '',
    });
    expect(findMrz(TD3)).toEqual({
      format: 'td3',
      documentCode: 'P<',
      expiresOn: '2012-04-15',
      documentNumber: 'L898902C3',
      optionalData: '',
    });
  });

  test('copes with OCR spacing, « for <, and dropped trailing filler', () => {
    const messy = ['I<UTO D23145890 7<<<<<<<<<<<', '7408122F1204159UTO«««««««««««6', 'ERIKSSON<<ANNA<MARIA'];
    expect(findMrz(messy)?.expiresOn).toBe('2012-04-15');
  });

  test('a misread expiry fails its check digit and is not used', () => {
    const misread = [TD1[0], '7408122F1204189UTO<<<<<<<<<<<6', TD1[2]];
    expect(findMrz(misread)).toMatchObject({ format: 'td1', documentCode: 'I<', expiresOn: null });
  });

  test("reads an Emirates ID's back, whose first line has no filler", () => {
    const eid = ['ILARE1234567897784199012345671', '7408122F1204159ARE<<<<<<<<<<<6', 'SMITH<<JANE<<<<<<<<<<<<<<<<<<<'];
    expect(findMrz(eid)).toEqual({
      format: 'td1',
      documentCode: 'IL',
      expiresOn: '2012-04-15',
      documentNumber: '123456789',
      optionalData: '784199012345671',
    });
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

  test('Arabic read as Latin junk gets the guess confidence (0.3) and is ignored', () => {
    const junk: OcrResult = { lines: [{ ...ocr([{ text: 'aладнaцl)', big: true }]).lines[0], confidence: 0.3 }] };
    expect(analyzeText(junk, TODAY).name).toBeUndefined();
  });

  test('the Arabic country header is not the card name', () => {
    expect(analyzeText(ocr([{ text: 'الإمارات العربية المتحدة', big: true }]), TODAY).name).toBeUndefined();
  });
});

// A UAE vehicle licence (mulkiya): English labels on the left, their values beside them, and the
// registration date on the right of the expiry's row. OCR reads each as its own line.
function mulkiya(): OcrResult {
  const at = (text: string, x: number, y: number, height = 0.03): OcrLine => ({
    text,
    confidence: 0.5,
    box: { x, y, width: 0.1, height },
  });
  return {
    lines: [
      at('UNITED ARAB EMIRATES', 0.3, 0.11),
      at('الإمارات العربية المتحدة', 0.3, 0.1, 0.05),
      at('Vehicle License', 0.35, 0.17),
      at('Owner', 0.09, 0.46),
      at('COMFORT DRIVE L.L.C', 0.22, 0.46),
      at('Exp. Date', 0.09, 0.561),
      at('22-05-2026', 0.22, 0.559),
      at('Reg. Date', 0.5, 0.557),
      at('23-05-2016', 0.64, 0.557),
      at('Ins. Exp.', 0.08, 0.609),
      at('30-06-2027', 0.22, 0.607),
    ],
  };
}

describe('reading a vehicle licence', () => {
  test('is named after the document', () => {
    expect(analyzeText(mulkiya(), TODAY).name).toEqual({ value: 'Vehicle License', confidence: 0.85 });
  });

  test('takes the date beside "Exp. Date", even though it has passed', () => {
    expect(analyzeText(mulkiya(), TODAY).expiresOn).toEqual({ value: '2026-05-22', confidence: 0.85 });
  });

  test('the insurance expiry is not the licence expiry', () => {
    const lines = mulkiya().lines.filter((l) => !['Exp. Date', '22-05-2026'].includes(l.text));
    expect(analyzeText({ lines }, TODAY).expiresOn?.value).not.toBe('2027-06-30');
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

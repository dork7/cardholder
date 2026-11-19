import { READ_PDF_MAX_PAGES, READ_TEXT_MAX_LENGTH } from '../../config';
import { readOtherPages } from '../pdfText';

jest.mock('../../images/pdf', () => ({ renderPages: jest.fn() }));

// A fake renderer: page i is drawn as the "JPEG" p<i>, until told to stop.
const render = jest.fn(
  async (
    pdf: { pageCount: number },
    _edge: number,
    onPage: (i: number, image: { jpegBase64: string; aspect: number }) => void,
    cancelled: () => boolean,
  ) => {
    for (let i = 0; i < pdf.pageCount && !cancelled(); i++) onPage(i, { jpegBase64: `p${i}`, aspect: 1 });
  },
);
const doc = (pageCount: number, coverPage = 0) => ({ pdfBase64: 'PDF', pageCount, coverPage });

test('every page but the cover is read, in order', async () => {
  const text = await readOtherPages(doc(3, 1), async (jpeg) => `text of ${jpeg}`, render);
  expect(text).toBe('text of p0\ntext of p2');
});

test('a one-page PDF has no other text', async () => {
  expect(await readOtherPages(doc(1), async () => 'never', render)).toBe('');
});

test('long PDFs stop after the first few pages, and the text is capped', async () => {
  const read = jest.fn(async () => 'x'.repeat(100));
  await readOtherPages(doc(50), read, render);
  expect(read).toHaveBeenCalledTimes(READ_PDF_MAX_PAGES);
  const long = await readOtherPages(doc(5), async () => 'y'.repeat(READ_TEXT_MAX_LENGTH), render);
  expect(long).toHaveLength(READ_TEXT_MAX_LENGTH);
});

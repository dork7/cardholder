import { makeCard } from '../../../test/fixtures';
import { cardMarkdown } from '../cardMarkdown';

const created = new Date(2026, 9, 1, 12).getTime();
const updated = new Date(2026, 10, 4, 12).getTime();

test('lists the details, then the text read off each side, with the card id as the reference', () => {
  const card = makeCard({
    id: 'abc123',
    name: 'Residence',
    category: 'Residency',
    expiresOn: '2027-03-14',
    remindDaysBefore: 14,
    tags: ['Government', 'UAE'],
    folderId: 'f1',
    hasBack: true,
    readText: { front: 'RESIDENCE PERMIT\nName: Hamza', back: 'Sponsor: ACME' },
    createdAt: created,
    updatedAt: updated,
  });
  expect(cardMarkdown(card, [{ id: 'f1', name: 'Family', createdAt: 0 }])).toBe(
    [
      '# Residence',
      '',
      '- **Category:** Residency',
      '- **Expires:** 2027-03-14',
      '- **Reminders:** Daily, from 14 days before',
      '- **Tags:** Government, UAE',
      '- **Folder:** Family',
      '- **Source:** Photos of the front and back',
      '- **Added:** 2026-10-01',
      '- **Updated:** 2026-11-04',
      '- **Reference:** `abc123`',
      '',
      '## Front',
      '',
      '```text',
      'RESIDENCE PERMIT\nName: Hamza',
      '```',
      '',
      '## Back',
      '',
      '```text',
      'Sponsor: ACME',
      '```',
      '',
    ].join('\n'),
  );
});

test('leaves out what the card does not have', () => {
  const md = cardMarkdown(makeCard({ name: '', category: 'membership', readText: { front: 'GYM', back: '' } }), []);
  expect(md).toContain('# Membership');
  expect(md).not.toMatch(/Expires|Reminders|Tags|Folder|## Back/);
  expect(md).toContain('- **Source:** Photo of the front');
});

test('says when a side or the whole card has no text yet', () => {
  expect(cardMarkdown(makeCard({ hasBack: true, readText: { front: 'X', back: '  ' } }), [])).toContain(
    '## Back\n\n_No text was read from this side._',
  );
  expect(cardMarkdown(makeCard({ readText: null }), [])).toContain('## Scanned text\n\n_No text has been read from this card yet.');
});

test('a PDF card names its pages', () => {
  expect(cardMarkdown(makeCard({ pdf: { pageCount: 3, coverPage: 0 }, readText: { front: 'P1', back: '' } }), [])).toContain(
    '- **Source:** PDF, 3 pages',
  );
});

test('backticks in the scanned text cannot close the code block early', () => {
  const md = cardMarkdown(makeCard({ readText: { front: 'a ``` b', back: '' } }), []);
  expect(md).toContain('````text\na ``` b\n````');
});

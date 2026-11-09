import { categoryLabel } from '../cards/categories';
import { displayName } from '../cards/display';
import { Card } from '../cards/types';
import { strings } from '../strings';
import { toIsoDate } from '../time/dates';

// The master lookup file: one Markdown table listing every document with its basic details and a
// short excerpt of its text. Asking reads it first to choose which documents to open, then reads
// those documents' own Markdown. Rebuilt on request (Settings, or the Ask window); kept sealed like
// everything else (see CardStore.saveLookup).

export interface LookupRow {
  index: number; // 1-based, as shown in the table
  id: string; // the document's reference
  line: string; // the row as written in the table
}

const s = strings.lookup;
const EXCERPT_CHARS = 120;

// Table cells can't hold pipes or line breaks.
const cell = (text: string) => text.replace(/\|/g, '/').replace(/\s+/g, ' ').trim();

export function excerpt(card: Card): string {
  if (!card.readText) return s.notRead;
  const text = cell(`${card.readText.front} ${card.readText.back}`);
  if (text === '') return s.nothingRead;
  return text.length > EXCERPT_CHARS ? `${text.slice(0, EXCERPT_CHARS - 1)}…` : text;
}

function pages(card: Card): string {
  if (card.pdf) return s.pdfPages(card.pdf.pageCount);
  return card.hasBack ? s.frontAndBack : s.frontOnly;
}

function rowFor(card: Card, index: number): LookupRow {
  const line = `| ${index} | ${cell(displayName(card))} | ${cell(categoryLabel(card.category))} | ${card.expiresOn ?? '—'} | ${
    card.tags.length > 0 ? cell(card.tags.join(', ')) : '—'
  } | ${pages(card)} | ${excerpt(card)} | \`${card.id}\` |`;
  return { index, id: card.id, line };
}

const HEADER = () =>
  [
    `| # | ${s.colName} | ${s.colCategory} | ${s.colExpires} | ${s.colTags} | ${s.colPages} | ${s.colText} | ${s.colReference} |`,
    '|---|---|---|---|---|---|---|---|',
  ].join('\n');

// Documents in name order, so the file reads like an index.
export function buildLookup(cards: readonly Card[], now: Date): string {
  const sorted = [...cards].sort((a, b) => displayName(a).localeCompare(displayName(b), undefined, { sensitivity: 'base' }));
  const rows = sorted.map((card, i) => rowFor(card, i + 1).line);
  return [
    `# ${s.title}`,
    `${s.intro(cards.length)} ${s.generated(toIsoDate(now))}`,
    rows.length > 0 ? `${HEADER()}\n${rows.join('\n')}` : `_${s.empty}_`,
    '',
  ].join('\n\n');
}

// The rows back out of a lookup file, for asking: each row's number and the document it points to.
export function parseLookup(markdown: string): LookupRow[] {
  const rows: LookupRow[] = [];
  for (const line of markdown.split('\n')) {
    const m = line.match(/^\|\s*(\d+)\s*\|.*`([^`]+)`\s*\|\s*$/);
    if (m) rows.push({ index: Number(m[1]), id: m[2], line });
  }
  return rows;
}

// The table header, for prompts that include only some rows.
export const lookupHeader = HEADER;

// A lookup file is out of date when documents were added, changed or deleted after it was made.
export function lookupIsStale(lookup: { createdAt: number; ids: readonly string[] }, cards: readonly Card[]): boolean {
  if (lookup.ids.length !== cards.length) return true;
  const ids = new Set(lookup.ids);
  return cards.some((c) => !ids.has(c.id) || c.updatedAt > lookup.createdAt);
}

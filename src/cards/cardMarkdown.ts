import { categoryLabel } from './categories';
import { displayName } from './display';
import { Card, Folder } from './types';
import { strings } from '../strings';
import { toIsoDate } from '../time/dates';

const s = strings.details;

// A fence longer than any run of backticks in the text, so scanned text can never close it early.
function fenced(text: string): string {
  const longest = Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  const fence = '`'.repeat(Math.max(3, longest + 1));
  return `${fence}text\n${text}\n${fence}`;
}

function section(title: string, text: string): string {
  return `## ${title}\n\n${text.trim() ? fenced(text.trim()) : `_${s.nothingRead}_`}`;
}

// The card as a Markdown document: its details, then the text read off each side. The card's id is
// the reference back to it, so a saved file can always be matched to the card it came from.
export function cardMarkdown(card: Card, folders: readonly Folder[]): string {
  const details: [string, string][] = [[s.category, categoryLabel(card.category)]];
  if (card.expiresOn) {
    details.push([s.expires, card.expiresOn]);
    details.push([s.reminders, s.remindValue(card.remindDaysBefore)]);
  }
  if (card.tags.length > 0) details.push([s.tags, card.tags.join(', ')]);
  const folder = card.folderId ? folders.find((f) => f.id === card.folderId) : undefined;
  if (folder) details.push([s.folder, folder.name]);
  details.push([s.source, card.pdf ? s.pdfPages(card.pdf.pageCount) : card.hasBack ? s.frontAndBack : s.frontOnly]);
  details.push([s.added, toIsoDate(new Date(card.createdAt))]);
  details.push([s.updated, toIsoDate(new Date(card.updatedAt))]);
  details.push([s.reference, `\`${card.id}\``]);

  const parts = [`# ${displayName(card)}`, details.map(([k, v]) => `- **${k}:** ${v}`).join('\n')];
  if (!card.readText) {
    parts.push(`## ${s.scannedText}\n\n_${s.notRead}_`);
  } else {
    // For a PDF card the front is its cover page and the back, when kept, its second page.
    parts.push(section(strings.card.front, card.readText.front));
    if (card.hasBack) parts.push(section(strings.card.back, card.readText.back));
  }
  return `${parts.join('\n\n')}\n`;
}

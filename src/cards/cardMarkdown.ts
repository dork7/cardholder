import { displayName } from './display';
import { Card, Folder } from './types';
import { strings } from '../strings';
import { toIsoDate } from '../time/dates';
import { ProfileDetails } from '../profiles/profile';

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

// A profile's details, in the order its card shows them. Part of the document's Details, so search finds them.
export function profileDetails(profile: ProfileDetails): [string, string][] {
  const out: [string, string][] = [];
  if (profile.dateOfBirth) out.push([s.dateOfBirth, profile.dateOfBirth]);
  out.push([s.bloodGroup, strings.profiles.bloodGroups[profile.bloodGroup]]);
  return out;
}

// The card as a Markdown document: its details, then the text read off each side. The card's id is
// the reference back to it, so a saved file can always be matched to the card it came from.
export function cardMarkdown(card: Card, folders: readonly Folder[]): string {
  const details: [string, string][] = card.profile ? profileDetails(card.profile) : [];
  if (card.expiresOn) {
    details.push([s.expires, card.expiresOn]);
    details.push([s.reminders, s.remindValue(card.remindDaysBefore)]);
  }
  if (card.tags.length > 0) details.push([s.tags, card.tags.join(', ')]);
  details.push([s.source, card.profile ? s.profile : card.pdf ? s.pdfPages(card.pdf.pageCount) : card.hasBack ? s.frontAndBack : s.frontOnly]);
  details.push([s.added, toIsoDate(new Date(card.createdAt))]);
  details.push([s.updated, toIsoDate(new Date(card.updatedAt))]);
  details.push([s.reference, `\`${card.id}\``]);

  const parts = [`# ${displayName(card)}`, details.map(([k, v]) => `- **${k}:** ${v}`).join('\n')];
  // Nothing is read off a profile's picture: Doc Keeper drew it from the details above.
  if (card.profile) return `${parts.join('\n\n')}\n`;
  if (!card.readText) {
    parts.push(`## ${s.scannedText}\n\n_${s.notRead}_`);
  } else {
    if (card.pdf && card.readText.pages?.length === card.pdf.pageCount) {
      card.readText.pages.forEach((text, i) => parts.push(section(s.page(i + 1), text)));
    } else {
      parts.push(section(strings.card.front, card.readText.front));
      if (card.hasBack) parts.push(section(strings.card.back, card.readText.back));
    }
  }
  return `${parts.join('\n\n')}\n`;
}

import { isValidIsoDate } from '../time/dates';
import type { Card } from '../cards/types';

// A profile is a Document that belongs to one Person and is drawn as a card (GLOSSARY.md). Its details
// live only in the document's sealed payload (ADR 0003); having them is what makes a document a profile.

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'] as const;
export type BloodGroup = (typeof BLOOD_GROUPS)[number];

export const PROFILE_TEMPLATES = ['medical'] as const;
export type ProfileTemplate = (typeof PROFILE_TEMPLATES)[number];

export interface ProfileDetails {
  dateOfBirth: string | null; // YYYY-MM-DD, local calendar day
  bloodGroup: BloodGroup;
  template: ProfileTemplate;
}

export const emptyProfile = (): ProfileDetails => ({ dateOfBirth: null, bloodGroup: 'unknown', template: 'medical' });

const isIsoDate = (v: unknown): v is string => typeof v === 'string' && isValidIsoDate(v);

// Reads sealed profile details back. Anything unrecognised falls back to its default, so a profile
// written by a newer version still opens; a value that is not profile details at all gives null.
export function toProfile(value: unknown): ProfileDetails | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  return {
    dateOfBirth: isIsoDate(v.dateOfBirth) ? v.dateOfBirth : null,
    bloodGroup: (BLOOD_GROUPS as readonly unknown[]).includes(v.bloodGroup) ? (v.bloodGroup as BloodGroup) : 'unknown',
    template: (PROFILE_TEMPLATES as readonly unknown[]).includes(v.template) ? (v.template as ProfileTemplate) : 'medical',
  };
}

// Whole years on `now`'s calendar day; null without a date of birth or for one in the future.
export function ageOn(dateOfBirth: string | null, now: Date): number | null {
  if (!dateOfBirth) return null;
  const [y, m, d] = dateOfBirth.split('-').map(Number);
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age--;
  return age >= 0 ? age : null;
}

// A Person has at most one profile; this finds it among current documents.
export function profileOf(cards: readonly Card[], personId: string): Card | undefined {
  return cards.find((card) => card.profile && card.personId === personId);
}

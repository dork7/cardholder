import { isValidIsoDate } from '../time/dates';
import type { Card } from '../cards/types';

// A profile is a Document that belongs to one Person and is drawn as a card (GLOSSARY.md). Its details
// live only in the document's sealed payload (ADR 0003); having them is what makes a document a profile.

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'] as const;
export type BloodGroup = (typeof BLOOD_GROUPS)[number];

export const PROFILE_TEMPLATES = ['medical', 'contact', 'compact', 'full'] as const;
export type ProfileTemplate = (typeof PROFILE_TEMPLATES)[number];
export const PROFILE_FIELDS = ['dateOfBirth', 'bloodGroup', 'conditions', 'allergies', 'medications',
  'medicalNotes', 'mobile', 'email', 'address', 'emergencyContacts'] as const;
export type ProfileField = (typeof PROFILE_FIELDS)[number];
export const defaultVisibleFields = (template: ProfileTemplate): ProfileField[] =>
  template === 'contact' ? ['dateOfBirth', 'mobile', 'email', 'address']
    : template === 'compact' ? ['dateOfBirth', 'bloodGroup', 'mobile', 'emergencyContacts'] : [...PROFILE_FIELDS];
export const showsField = (profile: ProfileDetails, field: ProfileField): boolean =>
  (profile.visibleFields ?? defaultVisibleFields(profile.template)).includes(field);

export interface ProfileDetails {
  dateOfBirth: string | null; // YYYY-MM-DD, local calendar day
  bloodGroup: BloodGroup;
  template: ProfileTemplate;
  conditions?: string[];
  allergies?: string[];
  medications?: string[];
  medicalNotes?: string;
  mobile?: string;
  email?: string;
  address?: string;
  emergencyContacts?: { name: string; relationship?: string; phone: string }[];
  visibleFields?: ProfileField[];
}

export const emptyProfile = (): ProfileDetails => ({ dateOfBirth: null, bloodGroup: 'unknown', template: 'medical' });

const isIsoDate = (v: unknown): v is string => typeof v === 'string' && isValidIsoDate(v);
const lists = ['conditions', 'allergies', 'medications'] as const;
const texts = ['medicalNotes', 'mobile', 'email', 'address'] as const;
const validList = (v: unknown): v is string[] => Array.isArray(v) && v.length <= 100 && v.every((entry) => typeof entry === 'string' && entry.length <= 200);
const validText = (v: unknown): v is string => typeof v === 'string' && v.length <= 5000;
const validContacts = (v: unknown): v is NonNullable<ProfileDetails['emergencyContacts']> =>
  Array.isArray(v) && v.length <= 3 && v.every((contact) =>
    typeof contact === 'object' && contact !== null && !Array.isArray(contact) &&
    typeof contact.name === 'string' && contact.name.length > 0 && contact.name.length <= 200 &&
    (contact.relationship === undefined || typeof contact.relationship === 'string' && contact.relationship.length <= 200) &&
    typeof contact.phone === 'string' && contact.phone.length > 0 && contact.phone.length <= 200);
const validVisibleFields = (v: unknown): v is ProfileField[] =>
  Array.isArray(v) && v.length <= PROFILE_FIELDS.length && new Set(v).size === v.length &&
  v.every((field) => (PROFILE_FIELDS as readonly unknown[]).includes(field));

// Reads sealed profile details back. Anything unrecognised falls back to its default, so a profile
// written by a newer version still opens; a value that is not profile details at all gives null.
export function toProfile(value: unknown): ProfileDetails | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  const profile: ProfileDetails = {
    dateOfBirth: isIsoDate(v.dateOfBirth) ? v.dateOfBirth : null,
    bloodGroup: (BLOOD_GROUPS as readonly unknown[]).includes(v.bloodGroup) ? (v.bloodGroup as BloodGroup) : 'unknown',
    template: (PROFILE_TEMPLATES as readonly unknown[]).includes(v.template) ? (v.template as ProfileTemplate) : 'medical',
  };
  for (const key of lists) if (validList(v[key])) profile[key] = v[key];
  for (const key of texts) if (validText(v[key])) profile[key] = v[key];
  if (validContacts(v.emergencyContacts)) profile.emergencyContacts = v.emergencyContacts;
  if (validVisibleFields(v.visibleFields)) profile.visibleFields = v.visibleFields;
  return profile;
}

// Backups are untrusted. Keep a profile only when every recognised field is valid; unknown
// templates or damaged details leave the document and its front picture intact.
export function profileFromBackup(value: unknown): ProfileDetails | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (!(PROFILE_TEMPLATES as readonly unknown[]).includes(v.template) || !(v.dateOfBirth === null || isIsoDate(v.dateOfBirth)) ||
      !(BLOOD_GROUPS as readonly unknown[]).includes(v.bloodGroup)) return null;
  for (const key of lists) if (v[key] !== undefined && !validList(v[key])) return null;
  for (const key of texts) if (v[key] !== undefined && !validText(v[key])) return null;
  if (v.emergencyContacts !== undefined && !validContacts(v.emergencyContacts)) return null;
  if (v.visibleFields !== undefined && !validVisibleFields(v.visibleFields)) return null;
  return toProfile(v);
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

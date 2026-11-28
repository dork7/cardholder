import { utf8 } from '../crypto/bytes';
import { strings } from '../strings';
import { ProfileDetails, ProfileField, showsField } from './profile';

const escape = (value: string) => value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');

// The scanner receives only fields currently visible on the card. A photo never enters the text.
export function profileVCard(name: string, profile: ProfileDetails): { value: string; tooLongFields: string[] } {
  const parts: { field: ProfileField | 'name'; text: string }[] = [
    { field: 'name', text: `N:${escape(name)};;;;` }, { field: 'name', text: `FN:${escape(name)}` },
  ];
  if (showsField(profile, 'mobile') && profile.mobile) parts.push({ field: 'mobile', text: `TEL;TYPE=CELL:${escape(profile.mobile)}` });
  if (showsField(profile, 'email') && profile.email) parts.push({ field: 'email', text: `EMAIL:${escape(profile.email)}` });
  if (showsField(profile, 'address') && profile.address) parts.push({ field: 'address', text: `ADR:;;${escape(profile.address)};;;;` });
  if (showsField(profile, 'dateOfBirth') && profile.dateOfBirth) parts.push({ field: 'dateOfBirth', text: `BDAY:${profile.dateOfBirth.replace(/-/g, '')}` });
  const notes: { field: ProfileField; text: string }[] = [];
  if (showsField(profile, 'bloodGroup')) notes.push({ field: 'bloodGroup', text: `${strings.profiles.bloodGroup}: ${strings.profiles.bloodGroups[profile.bloodGroup]}` });
  for (const field of ['conditions', 'allergies', 'medications'] as const) {
    if (showsField(profile, field) && profile[field]?.length) notes.push({ field, text: `${strings.profiles[field]}: ${profile[field]!.join(', ')}` });
  }
  if (showsField(profile, 'medicalNotes') && profile.medicalNotes) notes.push({ field: 'medicalNotes', text: `${strings.profiles.medicalNotes}: ${profile.medicalNotes}` });
  if (showsField(profile, 'emergencyContacts')) for (const [index, contact] of (profile.emergencyContacts ?? []).entries()) {
    notes.push({ field: 'emergencyContacts', text: `${strings.profiles.emergencyContacts} ${index + 1}: ${contact.name}${contact.relationship ? ` (${contact.relationship})` : ''}, ${contact.phone}` });
  }
  if (notes.length) parts.push({ field: 'medicalNotes', text: `NOTE:${escape(notes.map((note) => note.text).join('\n'))}` });
  const value = ['BEGIN:VCARD', 'VERSION:3.0', ...parts.map((part) => part.text), 'END:VCARD', ''].join('\r\n');
  const tooLongFields = utf8.encode(value).length > 1500
    ? [...parts.filter((part) => part.field !== 'name' && part.field !== 'medicalNotes'), ...notes]
      .sort((a, b) => utf8.encode(b.text).length - utf8.encode(a.text).length).slice(0, 3).map((part) => strings.profiles[part.field])
    : [];
  return { value, tooLongFields };
}

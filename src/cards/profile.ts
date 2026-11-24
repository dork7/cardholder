import { isValidIsoDate } from '../time/dates';
import { BloodGroup, Profile } from './types';

const GROUPS: readonly BloodGroup[] = ['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−', 'Unknown'];
const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const string = (value: unknown, max: number): value is string => typeof value === 'string' && value.length <= max;
const list = (value: unknown): value is string[] => Array.isArray(value) && value.length <= 100 && value.every((entry) => string(entry, 200));

// Unknown versions and damaged optional details are ignored so an older app can still restore the document.
export function parseProfile(value: unknown): Profile | undefined {
  if (!isObject(value) || value.template !== 'medical' ||
      !(value.dateOfBirth === null || (typeof value.dateOfBirth === 'string' && isValidIsoDate(value.dateOfBirth))) ||
      !GROUPS.includes(value.bloodGroup as BloodGroup)) return undefined;
  for (const key of ['conditions', 'allergies', 'medications'] as const) if (value[key] !== undefined && !list(value[key])) return undefined;
  for (const key of ['medicalNotes', 'mobile', 'email', 'address'] as const) if (value[key] !== undefined && !string(value[key], 5000)) return undefined;
  return {
    template: 'medical', dateOfBirth: value.dateOfBirth as string | null, bloodGroup: value.bloodGroup as BloodGroup,
    ...('conditions' in value && { conditions: value.conditions as string[] }),
    ...('allergies' in value && { allergies: value.allergies as string[] }),
    ...('medications' in value && { medications: value.medications as string[] }),
    ...('medicalNotes' in value && { medicalNotes: value.medicalNotes as string }),
    ...('mobile' in value && { mobile: value.mobile as string }),
    ...('email' in value && { email: value.email as string }),
    ...('address' in value && { address: value.address as string }),
  };
}

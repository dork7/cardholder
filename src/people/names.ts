import { PERSON_NAME_MAX_LENGTH } from '../config';

export function personName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim();
  return name && [...name].length <= PERSON_NAME_MAX_LENGTH ? name : null;
}

export const samePersonName = (a: string, b: string) => a.toLocaleLowerCase() === b.toLocaleLowerCase();

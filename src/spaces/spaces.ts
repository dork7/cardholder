export const SPACES = [
  { id: 'personal', name: 'Personal' },
  { id: 'family', name: 'Family' },
  { id: 'home', name: 'Home' },
  { id: 'travel', name: 'Travel' },
] as const;

export type SpaceId = (typeof SPACES)[number]['id'];

export function spaceFor(value: unknown): (typeof SPACES)[number] {
  return SPACES.find((space) => space.id === value) ?? SPACES[0];
}

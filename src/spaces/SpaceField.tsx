import { ChipRow } from '../ui/ChipRow';
import { Field } from '../ui/Field';
import { SpaceId, SPACES, spaceFor } from './spaces';

export function SpaceField({ value, onChange }: { value?: SpaceId; onChange(id: SpaceId): void }) {
  return <Field label="Space">
    <ChipRow accessibilityLabel="Space" chips={SPACES.map(({ id, name }) => ({
      key: id, label: name, selected: spaceFor(value).id === id, onPress: () => onChange(id), testID: `assign-space-${id}`,
    }))} />
  </Field>;
}

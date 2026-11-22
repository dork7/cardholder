import { strings } from '../strings';
import { DateField } from './DateField';

export function ExpiryField({
  value,
  onChange,
  hint,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  hint?: string;
}) {
  return (
    <DateField
      icon="expiry"
      label={strings.edit.expiry}
      addLabel={strings.edit.addExpiry}
      clearLabel={strings.edit.clearExpiry}
      value={value}
      onChange={onChange}
      hint={hint}
    />
  );
}

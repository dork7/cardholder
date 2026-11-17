import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, View } from 'react-native';
import { strings } from '../strings';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { LiveText } from '../ui/LiveText';
import { useTheme } from '../ui/theme';

export function NoteReminder({ value, disabled, onSave }: {
  value?: number;
  disabled: boolean;
  onSave(at: number | null): Promise<void>;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => new Date(value ?? Date.now() + 3600000));
  const [error, setError] = useState<string | null>(null);
  const save = async (at: number | null) => {
    setError(null);
    if (at !== null && (!Number.isFinite(at) || at <= Date.now())) { setError(strings.notes.reminderInvalid); return; }
    try { await onSave(at); setOpen(false); }
    catch (e) { setError(e instanceof Error && e.message === 'permission-denied' ? strings.notes.reminderDenied : strings.notes.reminderFailed); }
  };
  const pick = (mode: 'date' | 'time', picked: Date) => {
    setDraft((previous) => {
      const next = new Date(previous);
      if (mode === 'date') next.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
      else next.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
      return next;
    });
    setError(null);
  };
  return <View style={{ gap: 12 }}>
    {value !== undefined && <LiveText style={{ color: theme.muted }}>{strings.notes.reminderScheduled(new Date(value).toLocaleString())}</LiveText>}
    <Button variant="secondary" label={strings.notes.remind} disabled={disabled} onPress={() => {
      setDraft(new Date(value ?? Date.now() + 3600000)); setError(null); setOpen(true);
    }} />
    {open && <>
      {(['date', 'time'] as const).map((mode) => <Field key={mode} label={mode === 'date' ? strings.notes.reminderDate : strings.notes.reminderTime}>
        {Platform.OS === 'ios' ? <DateTimePicker value={draft} mode={mode} display="compact" disabled={disabled}
          accessibilityLabel={mode === 'date' ? strings.notes.reminderDate : strings.notes.reminderTime}
          onChange={(event, picked) => { if (event.type === 'set' && picked) pick(mode, picked); }} /> :
          <Button variant="secondary" disabled={disabled} label={mode === 'date' ? draft.toLocaleDateString() : draft.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            onPress={() => DateTimePickerAndroid.open({ value: draft, mode, onChange: (event, picked) => {
              if (event.type === 'set' && picked) pick(mode, picked);
            } })} />}
      </Field>)}
      <Button variant="secondary" label={strings.common.cancel} disabled={disabled} onPress={() => setOpen(false)} />
      <Button variant="secondary" label={strings.notes.reminderSave} disabled={disabled} onPress={() => void save(draft.getTime())} />
    </>}
    {value !== undefined && <Button variant="secondary" label={strings.notes.reminderRemove} disabled={disabled} onPress={() => void save(null)} />}
    {error && <LiveText style={{ color: theme.danger }}>{error}</LiveText>}
  </View>;
}

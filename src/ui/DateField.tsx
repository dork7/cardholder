import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, StyleSheet, View } from 'react-native';
import { formatDate, fromIsoDate, toIsoDate } from '../time/dates';
import { Button } from './Button';
import { Field } from './Field';
import { RetroIconName } from './RetroIcon';

// An optional calendar date, picked with the system date picker. `value` is YYYY-MM-DD or null.
export function DateField({
  label,
  addLabel,
  clearLabel,
  value,
  onChange,
  hint,
  icon,
  maximumDate,
  testID,
}: {
  label: string;
  addLabel: string;
  clearLabel: string;
  value: string | null;
  onChange: (value: string | null) => void;
  hint?: string;
  icon?: RetroIconName;
  maximumDate?: Date;
  testID?: string;
}) {
  const date = value ? fromIsoDate(value) : new Date();

  const openAndroidDialog = () =>
    DateTimePickerAndroid.open({
      value: date,
      mode: 'date',
      maximumDate,
      onChange: (event, picked) => {
        if (event.type === 'set' && picked) onChange(toIsoDate(picked));
      },
    });

  return (
    <Field icon={icon} label={label} hint={hint}>
      {value === null ? (
        <Button
          variant="secondary"
          label={addLabel}
          onPress={Platform.OS === 'android' ? openAndroidDialog : () => onChange(toIsoDate(new Date()))}
          testID={testID && `${testID}-add`}
        />
      ) : (
        <View style={styles.row}>
          {Platform.OS === 'ios' ? (
            <DateTimePicker
              value={date}
              mode="date"
              display="compact"
              maximumDate={maximumDate}
              accessibilityLabel={label}
              onChange={(_event, picked) => picked && onChange(toIsoDate(picked))}
              testID={testID}
            />
          ) : (
            <Button variant="secondary" label={formatDate(date.getTime())} accessibilityHint={label} onPress={openAndroidDialog} testID={testID} />
          )}
          <Button variant="secondary" label={clearLabel} onPress={() => onChange(null)} testID={testID && `${testID}-clear`} />
        </View>
      )}
    </Field>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
});

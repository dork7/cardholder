import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, StyleSheet, View } from 'react-native';
import { strings } from '../strings';
import { formatDate, fromIsoDate, toIsoDate } from '../time/dates';
import { Button } from './Button';
import { Field } from './Field';

export function ExpiryField({ value, onChange }: { value: string | null; onChange: (value: string | null) => void }) {
  const date = value ? fromIsoDate(value) : new Date();

  const openAndroidDialog = () =>
    DateTimePickerAndroid.open({
      value: date,
      mode: 'date',
      onChange: (event, picked) => {
        if (event.type === 'set' && picked) onChange(toIsoDate(picked));
      },
    });

  return (
    <Field label={strings.edit.expiry}>
      {value === null ? (
        <Button
          variant="secondary"
          label={strings.edit.addExpiry}
          onPress={Platform.OS === 'android' ? openAndroidDialog : () => onChange(toIsoDate(new Date()))}
        />
      ) : (
        <View style={styles.row}>
          {Platform.OS === 'ios' ? (
            <DateTimePicker
              value={date}
              mode="date"
              display="compact"
              accessibilityLabel={strings.edit.expiry}
              onChange={(_event, picked) => picked && onChange(toIsoDate(picked))}
            />
          ) : (
            <Button variant="secondary" label={formatDate(date.getTime())} onPress={openAndroidDialog} />
          )}
          <Button variant="secondary" label={strings.edit.clearExpiry} onPress={() => onChange(null)} />
        </View>
      )}
    </Field>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
});

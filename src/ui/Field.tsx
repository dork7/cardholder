import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { FONT, Text } from './Text';
import { useTheme } from './theme';
import { LiveText } from './LiveText';
import { RetroIcon, RetroIconName } from './RetroIcon';

// `hint` is a short tag beside the label, e.g. "Suggested" when the value was read from the card.
export function Field({ label, error, hint, icon, children }: { icon?: RetroIconName; label: string; error?: string; hint?: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        {icon && <RetroIcon name={icon} size={24} />}
        <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
        {hint ? <Text style={[styles.hint, { color: theme.muted }]}>{hint}</Text> : null}
      </View>
      {children}
      {error ? (
        <LiveText style={[styles.error, { color: theme.danger }]}>
          {error}
        </LiveText>
      ) : null}
    </View>
  );
}

export function useInputStyle() {
  const theme = useTheme();
  // `muted`, not `rosette`: the underline is the field's only outline and needs 3:1 on a panel.
  return [styles.input, { color: theme.text, borderColor: theme.muted }];
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
  label: { fontSize: 16, fontWeight: '600' },
  hint: { fontSize: 14 },
  error: { fontSize: 16 },
  input: { minHeight: 48, borderBottomWidth: 1, paddingHorizontal: 2, paddingVertical: 10, fontSize: 16, fontFamily: FONT.regular },
});

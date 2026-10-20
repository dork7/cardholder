import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { FONT, Text } from './Text';
import { useTheme } from './theme';

export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      {children}
      {error ? (
        <Text style={[styles.error, { color: theme.danger }]} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function useInputStyle() {
  const theme = useTheme();
  return [styles.input, { color: theme.text, borderColor: theme.rosette }];
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  label: { fontSize: 16, fontWeight: '600' },
  error: { fontSize: 16 },
  input: { minHeight: 48, borderBottomWidth: 1, paddingHorizontal: 2, paddingVertical: 10, fontSize: 18, fontFamily: FONT.regular },
});

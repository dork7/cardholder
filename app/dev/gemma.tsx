import { Redirect, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { ExtractRun, extractWithGemma, modelFile, releaseGemma } from '../../src/analysis/gemma';
import { strings } from '../../src/strings';
import { Button } from '../../src/ui/Button';
import { Field, useInputStyle } from '../../src/ui/Field';
import { GlassPanel, GlassScene } from '../../src/ui/Glass';
import { Text } from '../../src/ui/Text';
import { TYPE, useTheme } from '../../src/ui/theme';

// Development-only test bench for the phase 5 sample: paste card text, run Gemma 3 270M on the
// phone, see what it suggests after validation. Open it with cardholder://dev/gemma.
// Strings stay inline: this screen never ships to users.

const SAMPLES: { label: string; text: string }[] = [
  {
    label: 'Emirates ID',
    text: 'UNITED ARAB EMIRATES\nRESIDENT IDENTITY CARD\nبطاقة هوية مقيم\nID Number 784-1987-7654321-4\nName: Omar Khalid\nNationality: Jordan\nExpiry Date 09/11/2030',
  },
  {
    label: 'Insurance',
    text: 'DAMAN\nNational Health Insurance Company\nThiqa\nMember Name: LAYLA HASSAN\nPolicy No. 1100 2345 6789\nValid Until: 31-12-2027',
  },
  {
    label: 'Gym',
    text: "GOLD'S GYM\nDUBAI MARINA\nMEMBER\nAHMED ALI\nMember ID 88213\nExp 06/2027",
  },
  {
    label: 'Library',
    text: 'Dubai Public Library\nBorrower card\nCard No. 2231 9087\nPlease return items on time',
  },
];

export default function GemmaBench() {
  if (!__DEV__) return <Redirect href="/" />;
  return <Bench />;
}

function Bench() {
  const theme = useTheme();
  const inputStyle = useInputStyle();
  const [text, setText] = useState(SAMPLES[0].text);
  const [run, setRun] = useState<ExtractRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const hasModel = modelFile().exists;

  // Free the ~300 MB model as soon as the bench closes.
  useEffect(() => () => void releaseGemma(), []);

  const extract = async () => {
    setBusy(true);
    setError(null);
    setRun(null);
    try {
      setRun(await extractWithGemma(text));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const s = run?.suggestion;
  const rows: [string, string][] = s
    ? [
        ['Name', s.name ?? '—'],
        ['Expiry', s.expiresOn ?? '—'],
        ['Category', s.category ? strings.categories[s.category] : '—'],
      ]
    : [];

  return (
    <GlassScene>
      <Stack.Screen options={{ title: 'Gemma 3 270M' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {!hasModel && (
          <GlassPanel style={styles.group}>
            <Text style={[styles.body, { color: theme.danger }]}>
              Model missing. Copy {modelFile().name} into the app's documents folder under models/ (see
              docs/gemma-sample.md).
            </Text>
          </GlassPanel>
        )}

        <GlassPanel style={styles.group}>
          <View style={styles.chips}>
            {SAMPLES.map((sample) => (
              <Pressable
                key={sample.label}
                onPress={() => setText(sample.text)}
                accessibilityRole="button"
                style={[styles.chip, { borderColor: theme.muted }]}
              >
                <Text style={{ color: theme.text, fontSize: TYPE.caption }}>{sample.label}</Text>
              </Pressable>
            ))}
          </View>
          <Field label="Card text (as OCR would read it)">
            <TextInput
              value={text}
              onChangeText={setText}
              multiline
              style={[inputStyle, styles.input]}
              testID="card-text"
            />
          </Field>
          <Button label={busy ? 'Running…' : 'Extract'} onPress={extract} disabled={busy || !hasModel} testID="extract" />
        </GlassPanel>

        {error && (
          <GlassPanel style={styles.group}>
            <Text style={[styles.body, { color: theme.danger }]}>{error}</Text>
          </GlassPanel>
        )}

        {run && (
          <GlassPanel style={styles.group} testID="result">
            {s ? (
              rows.map(([label, value]) => (
                <View key={label} style={styles.row}>
                  <Text style={[styles.body, { color: theme.muted }]}>{label}</Text>
                  <Text style={[styles.body, { color: theme.text, fontWeight: '600' }]}>{value}</Text>
                </View>
              ))
            ) : (
              <Text style={[styles.body, { color: theme.danger }]}>Output was not usable JSON.</Text>
            )}
            <Text style={[styles.mono, { color: theme.muted }]}>{run.raw}</Text>
            <Text style={[styles.caption, { color: theme.muted }]}>
              Prompt {Math.round(run.promptMs)} ms · output {Math.round(run.predictMs)} ms ·{' '}
              {run.tokensPerSecond.toFixed(1)} tokens/s
            </Text>
          </GlassPanel>
        )}
      </ScrollView>
    </GlassScene>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  group: { padding: 16, gap: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  input: { minHeight: 140, textAlignVertical: 'top' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  body: { fontSize: TYPE.secondary },
  mono: { fontSize: TYPE.caption, fontFamily: 'monospace' },
  caption: { fontSize: TYPE.caption },
});

import { Redirect, Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { CATALOG, entry } from '../../src/ai/catalog';
import { runEval } from '../../src/ai/eval/runEval';
import { BenchRow, toMarkdown } from '../../src/ai/eval/score';
import { localAskModel } from '../../src/ai/models';
import {
  ExtractRun,
  extractWithLocalModel,
  onGpu,
  releaseLocalModel,
  setContextOverride,
} from '../../src/analysis/localModel';
import { cancelModelDownload, removeModel, setActive, startModelDownload, useMenuState } from '../../src/analysis/modelDownload';
import { strings } from '../../src/strings';
import { Button } from '../../src/ui/Button';
import { Field, useInputStyle } from '../../src/ui/Field';
import { Panel, Screen } from '../../src/ui/Surface';
import { Text } from '../../src/ui/Text';
import { TYPE, useTheme } from '../../src/ui/theme';

// Development-only bench for the downloaded models (docs/model-bench.md): download and pick a model,
// pick a context size, then run the whole test set (src/ai/eval) and copy the results table; or paste
// one card's text and see what the model suggests. Open it with cardholder://dev/models.
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

export default function ModelBench() {
  if (!__DEV__) return <Redirect href="/" />;
  return <Bench />;
}

const CONTEXTS = [4096, 8192] as const;

function Bench() {
  const theme = useTheme();
  const inputStyle = useInputStyle();
  const menu = useMenuState();
  const [text, setText] = useState(SAMPLES[0].text);
  const [run, setRun] = useState<ExtractRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [nCtx, setNCtx] = useState<number | null>(null); // null: the model's own
  const [rows, setRows] = useState<BenchRow[]>([]);
  const [step, setStep] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const active = menu.active ? entry(menu.active) : null;
  const hasModel = active !== null;

  // Free the model and forget the context override as soon as the bench closes.
  useEffect(
    () => () => {
      abort.current?.abort();
      setContextOverride(null);
      void releaseLocalModel();
    },
    [],
  );

  const chooseContext = (n: number | null) => {
    setNCtx(n);
    setContextOverride(n);
  };

  const runAll = async () => {
    if (!active) return;
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setError(null);
    const ctx = nCtx ?? active.nCtx;
    try {
      const row = await runEval({
        label: active.name,
        nCtx: ctx,
        extract: (t) => extractWithLocalModel(t, controller.signal),
        askModel: (onFirstWord) => localAskModel(ctx, onFirstWord),
        onGpu,
        now: () => Date.now(),
        signal: controller.signal,
        onStep: (done, of) => setStep(`${done}/${of}`),
      });
      setRows((r) => [...r, row]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      setStep(null);
    }
  };

  const extract = async () => {
    setBusy(true);
    setError(null);
    setRun(null);
    try {
      setRun(await extractWithLocalModel(text));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const s = run?.suggestion;
  const fields: [string, string][] = s
    ? [
        ['Name', s.name ?? '—'],
        ['Expiry', s.expiresOn ?? '—'],
        ['Category', s.category ?? '—'],
      ]
    : [];

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Model bench' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Panel style={styles.group} testID="models">
          {CATALOG.map((m) => {
            const state = menu.models[m.id];
            return (
              <View key={m.id} style={styles.row}>
                <Text style={[styles.body, { color: theme.text, fontWeight: menu.active === m.id ? '700' : '400' }]}>
                  {m.name} · {Math.round(m.bytes / 1e6)} MB
                  {state.status === 'downloading' ? ` · ${state.progress === null ? '…' : `${Math.round(state.progress * 100)}%`}` : ''}
                  {state.status === 'absent' && state.failure ? ` · ${state.failure}` : ''}
                </Text>
                <View style={styles.chips}>
                  {state.status === 'present' && menu.active !== m.id && <Chip label="Use" onPress={() => void setActive(m.id)} />}
                  {state.status === 'present' && <Chip label="Delete" onPress={() => void removeModel(m.id)} />}
                  {state.status === 'downloading' && <Chip label="Stop" onPress={() => cancelModelDownload(m.id)} />}
                  {state.status === 'absent' && menu.downloading === null && <Chip label="Download" onPress={() => void startModelDownload(m.id)} />}
                </View>
              </View>
            );
          })}
          <View style={styles.chips}>
            <Chip label={`Own (${active?.nCtx ?? '—'})`} selected={nCtx === null} onPress={() => chooseContext(null)} />
            {CONTEXTS.map((n) => (
              <Chip key={n} label={String(n)} selected={nCtx === n} onPress={() => chooseContext(n)} />
            ))}
          </View>
          <Button
            label={busy ? `Running… ${step ?? ''}` : 'Run all'}
            onPress={() => void runAll()}
            disabled={busy || !hasModel}
            testID="run-all"
          />
          {busy && <Button label="Stop" variant="secondary" onPress={() => abort.current?.abort()} />}
          {rows.length > 0 && (
            <Text selectable style={[styles.mono, { color: theme.text }]} testID="bench-table">
              {toMarkdown(rows)}
            </Text>
          )}
        </Panel>

        <Panel style={styles.group}>
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
        </Panel>

        {error && (
          <Panel style={styles.group}>
            <Text style={[styles.body, { color: theme.danger }]}>{error}</Text>
          </Panel>
        )}

        {run && (
          <Panel style={styles.group} testID="result">
            {s ? (
              fields.map(([label, value]) => (
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
          </Panel>
        )}
      </ScrollView>
    </Screen>
  );
}

function Chip({ label, onPress, selected }: { label: string; onPress: () => void; selected?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[styles.chip, { borderColor: selected ? theme.accent : theme.muted }]}
    >
      <Text style={{ color: theme.text, fontSize: TYPE.caption }}>{label}</Text>
    </Pressable>
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

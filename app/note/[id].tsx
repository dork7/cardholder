import { Stack, useLocalSearchParams, usePreventRemove, useRouter } from 'expo-router';
import { ComponentRef, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/app/AppProvider';
import { NoteEditor } from '../../src/notes/noteEditors';
import { isBlankNote, Note } from '../../src/notes/noteStore';
import { strings } from '../../src/strings';
import { Button } from '../../src/ui/Button';
import { Field, useInputStyle } from '../../src/ui/Field';
import { LiveText } from '../../src/ui/LiveText';
import { ActionFooter, Screen } from '../../src/ui/Surface';
import { TYPE, useTheme } from '../../src/ui/theme';

export default function NoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { services } = useApp();
  const theme = useTheme();
  const [loaded, setLoaded] = useState<{ note: Note | null } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    if (id === 'new') { setLoaded({ note: null }); return; }
    services.notes.get(id).then((note) => {
      if (!live) return;
      if (note) setLoaded({ note });
      else setProblem(strings.notes.missing);
    }).catch(() => { if (live) setProblem(strings.notes.loadFailed); });
    return () => { live = false; };
  }, [id, services]);
  if (problem) return <Screen><LiveText style={{ color: theme.danger, padding: 16 }}>{problem}</LiveText></Screen>;
  if (!loaded) return <Screen><ActivityIndicator color={theme.accent} /></Screen>;
  return <Editor key={id} note={loaded.note} />;
}

function Editor({ note }: { note: Note | null }) {
  const { services } = useApp();
  const router = useRouter();
  const theme = useTheme();
  const inputStyle = useInputStyle();
  const insets = useSafeAreaInsets();
  const container = useRef<ComponentRef<typeof View>>(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [editor] = useState<NoteEditor>(() => services.noteEditors.open(note));
  const [fields, setFields] = useState({ title: note?.title ?? '', body: note?.body ?? '' });
  const [status, setStatus] = useState(editor.status());
  const [pinned, setPinned] = useState(note?.pinned ?? false);
  const [busy, setBusy] = useState(false);
  const [closed, setClosed] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [actionFailed, setActionFailed] = useState(false);

  useEffect(() => editor.subscribe(() => setStatus(editor.status())), [editor]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') void editor.flush().catch(() => {});
    });
    return () => { sub.remove(); };
  }, [editor]);

  // Covers Done, system back, header back and interactive dismissal. A failed save leaves the
  // editor and its text on screen, so the user can retry instead of silently losing changes.
  usePreventRemove(!closed, ({ repeat }) => {
    if (busy) return;
    setBusy(true);
    void editor.finish().then(() => { setClosed(true); repeat(); }).catch(() => {
      setActionFailed(true);
    }).finally(() => setBusy(false));
  });

  const change = (key: 'title' | 'body', value: string) => {
    const next = { ...fields, [key]: value };
    setFields(next);
    setActionFailed(false);
    editor.change(next);
  };
  const pin = async () => {
    setBusy(true);
    try {
      await editor.flush();
      await services.notes.setPinned(editor.id, !pinned);
      setPinned(!pinned);
      setActionFailed(false);
    } catch { setActionFailed(true); }
    finally { setBusy(false); }
  };
  const remove = () => Alert.alert(strings.notes.deleteTitle, strings.notes.deleteBody, [
    { text: strings.common.cancel, style: 'cancel' },
    { text: strings.common.delete, style: 'destructive', onPress: () => {
      setBusy(true);
      void editor.discard().then(() => { setClosed(true); setDeleted(true); }).catch(() => {
        setActionFailed(true);
        setBusy(false);
      });
    } },
  ]);
  // After deletion, render once with navigation prevention disabled before going back.
  useEffect(() => { if (deleted) router.back(); }, [deleted, router]);
  return (
    <Screen>
      <Stack.Screen options={{ title: note ? strings.notes.editTitle : strings.notes.newTitle }} />
      <View ref={container} style={styles.fill} onLayout={() => {
        // Keyboard coordinates are window-relative; this screen starts below the native header.
        container.current?.measureInWindow((_x, y) => setKeyboardOffset(y));
      }}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={keyboardOffset}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Field label={strings.notes.titleLabel}>
            <TextInput value={fields.title} onChangeText={(value) => change('title', value)}
              editable={!busy} accessibilityLabel={strings.notes.titleLabel} style={inputStyle} testID="note-title" />
          </Field>
          <Field label={strings.notes.bodyLabel}>
            <TextInput value={fields.body} onChangeText={(value) => change('body', value)} multiline
              editable={!busy} accessibilityLabel={strings.notes.bodyLabel} style={[inputStyle, styles.body]} testID="note-body" />
          </Field>
          <LiveText style={{ color: status === 'error' || actionFailed ? theme.danger : theme.muted }} testID="note-status">
            {status === 'error' || actionFailed ? strings.notes.failed : isBlankNote(fields) ? strings.notes.blank : status === 'saving' ? strings.notes.saving : strings.notes.saved}
          </LiveText>
          {(status === 'error' || actionFailed) && <Button variant="secondary" label={strings.notes.retry} onPress={() => {
            setActionFailed(false);
            void editor.flush().catch(() => {});
          }} />}
          <View style={styles.secondary}>
            <Button variant="secondary" label={pinned ? strings.notes.unpin : strings.notes.pin} onPress={() => void pin()}
              disabled={busy || isBlankNote(fields)} testID="note-pin" />
            <Button variant="danger" label={strings.notes.remove} onPress={remove} disabled={busy} testID="note-delete" />
          </View>
        </ScrollView>
        <ActionFooter style={[styles.actions, { paddingBottom: insets.bottom + 16 }]}>
          <Button label={strings.notes.done} onPress={() => router.back()} disabled={busy} testID="note-done" />
        </ActionFooter>
      </KeyboardAvoidingView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: 16, gap: 24, flexGrow: 1 },
  body: { minHeight: 240, textAlignVertical: 'top', fontSize: TYPE.body },
  secondary: { gap: 16, marginTop: 24 },
  actions: { padding: 16 },
});

import * as Clipboard from 'expo-clipboard';
import { Stack, useLocalSearchParams, usePreventRemove, useRouter } from 'expo-router';
import { ComponentRef, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, KeyboardAvoidingView, Platform, Pressable, Share, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/app/AppProvider';
import { NoteReminder } from '../../src/notes/NoteReminder';
import { requestReminderPermissionOnce } from '../../src/reminders/scheduler';
import { hasChecklist, NoteBody } from '../../src/notes/NoteBody';
import { NoteEditor } from '../../src/notes/noteEditors';
import { isBlankNote, Note, NoteFields } from '../../src/notes/noteStore';
import { allTags, normalizeTags, sameTag } from '../../src/cards/tags';
import { MAX_TAGS } from '../../src/config';
import { TagChips } from '../../src/ui/TagChips';
import { TagNameInput } from '../../src/ui/TagNameInput';
import { ChipRow } from '../../src/ui/ChipRow';
import { takePendingNoteText } from '../../src/share/sharedIn';
import { strings } from '../../src/strings';
import { Button } from '../../src/ui/Button';
import { Field, useInputStyle } from '../../src/ui/Field';
import { LiveText } from '../../src/ui/LiveText';
import { ActionFooter, Screen } from '../../src/ui/Surface';
import { SpaceField } from '../../src/spaces/SpaceField';
import { SpaceId, spaceFor } from '../../src/spaces/spaces';
import { TYPE, useTheme } from '../../src/ui/theme';

export default function NoteScreen() {
  const { id, documentId, space } = useLocalSearchParams<{ id: string; documentId?: string; space?: string }>();
  const { services } = useApp();
  const theme = useTheme();
  const [loaded, setLoaded] = useState<{ note: Note | null; initialBody?: string } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    if (id === 'new') { setLoaded({ note: null, initialBody: takePendingNoteText() ?? '' }); return; }
    services.notes.get(id).then((note) => {
      if (!live) return;
      if (note) setLoaded({ note });
      else setProblem(strings.notes.missing);
    }).catch(() => { if (live) setProblem(strings.notes.loadFailed); });
    return () => { live = false; };
  }, [id, services]);
  if (problem) return <Screen><LiveText style={{ color: theme.danger, padding: 16 }}>{problem}</LiveText></Screen>;
  if (!loaded) return <Screen><ActivityIndicator color={theme.accent} /></Screen>;
  return <Editor key={id} note={loaded.note} initialBody={loaded.initialBody} initialDocumentId={documentId} initialSpace={space ? spaceFor(space).id : undefined} />;
}

function Editor({ note, initialBody = '', initialDocumentId, initialSpace }: { note: Note | null; initialBody?: string; initialDocumentId?: string; initialSpace?: SpaceId }) {
  const { services, refresh, cards = [], notes = [] } = useApp();
  const router = useRouter();
  const theme = useTheme();
  const inputStyle = useInputStyle();
  const insets = useSafeAreaInsets();
  const container = useRef<ComponentRef<typeof View>>(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [editor] = useState<NoteEditor>(() => services.noteEditors.open(note));
  const [fields, setFields] = useState<NoteFields>({
    title: note?.title ?? '', body: note?.body ?? initialBody, ...(note?.spaceId ?? initialSpace ? { spaceId: note?.spaceId ?? initialSpace } : {}),
  });
  const [status, setStatus] = useState(editor.status());
  const [reminderAt, setReminderAt] = useState(note?.reminderAt);
  const [pinned, setPinned] = useState(note?.pinned ?? false);
  const [tags, setTags] = useState(note?.tags ?? []);
  const [namingTag, setNamingTag] = useState(false);
  const [documentId, setDocumentId] = useState(note?.documentId ?? initialDocumentId ?? null);
  const [busy, setBusy] = useState(false);
  const [editingBody, setEditingBody] = useState(false);
  const showChecklist = !editingBody && hasChecklist(fields.body);
  const [closed, setClosed] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [actionFailed, setActionFailed] = useState(false);
  const [transferStatus, setTransferStatus] = useState<string | null>(null);
  const transfer = (kind: 'share' | 'copy') => Alert.alert(
    kind === 'share' ? strings.notes.shareTitle : strings.notes.copyTitle,
    kind === 'share' ? strings.notes.shareWarning : strings.notes.copyWarning,
    [
      { text: strings.common.cancel, style: 'cancel' },
      { text: kind === 'share' ? strings.notes.share : strings.notes.copy, onPress: async () => {
        setBusy(true);
        setTransferStatus(null);
        try {
          if (kind === 'share') {
            const message = fields.title.trim() ? `${fields.title}\n\n${fields.body}` : fields.body;
            await Share.share({ message });
          } else {
            await Clipboard.setStringAsync(fields.body);
            setTransferStatus(strings.notes.copied);
          }
        } catch { setTransferStatus(strings.notes.transferFailed); }
        finally { setBusy(false); }
      } },
    ],
  );

  useEffect(() => editor.subscribe(() => setStatus(editor.status())), [editor]);
  useEffect(() => {
    if (!note && initialBody) editor.change({ title: '', body: initialBody, ...(initialSpace && { spaceId: initialSpace }) });
  }, [editor, note, initialBody, initialSpace]);

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
    void editor.finish().then(async () => {
      if (!isBlankNote(fields) && documentId !== note?.documentId) await services.notes.setDocument(editor.id, documentId);
      await refresh().catch(() => console.warn('Refresh after note change failed'));
    }).then(() => { setClosed(true); repeat(); }).catch(() => {
      setActionFailed(true);
    }).finally(() => setBusy(false));
  });

  const updateFields = (next: NoteFields) => {
    setFields(next);
    setActionFailed(false);
    editor.change(next);
  };
  const change = (key: 'title' | 'body', value: string) => updateFields({ ...fields, [key]: value });
  const pin = async () => {
    setBusy(true);
    try {
      await editor.flush();
      await services.notes.setPinned(editor.id, !pinned);
      setPinned(!pinned);
      await refresh();
      setActionFailed(false);
    } catch { setActionFailed(true); }
    finally { setBusy(false); }
  };
  const changeTags = async (next: string[]) => {
    if (isBlankNote(fields)) { Alert.alert(strings.notes.writeBeforeTagging); return; }
    setBusy(true);
    try {
      await editor.flush();
      await services.notes.setTags(editor.id, next);
      setTags(next);
      await refresh();
      setActionFailed(false);
    } catch { setActionFailed(true); }
    finally { setBusy(false); }
  };
  const remove = () => Alert.alert(strings.notes.deleteTitle, strings.notes.deleteBody, [
    { text: strings.common.cancel, style: 'cancel' },
    { text: strings.common.delete, style: 'destructive', onPress: () => {
      setBusy(true);
      void editor.discard().then(() => refresh().catch(() => console.warn('Refresh after note change failed'))).then(() => { setClosed(true); setDeleted(true); }).catch(() => {
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
          <SpaceField value={fields.spaceId} onChange={(spaceId) => updateFields({ ...fields, spaceId })} />
          <Field label={strings.notes.bodyLabel}>
            <LiveText style={{ color: theme.muted }}>{strings.notes.checklistHint}</LiveText>
            {/* A checklist shows once: as rows to tick while not typing, as its text while typing (#45). */}
            {showChecklist ? (
              <Pressable onPress={() => setEditingBody(true)} disabled={busy} accessibilityRole="button" accessibilityLabel={strings.notes.editBody}
                style={[inputStyle, styles.body]} testID="note-body-preview">
                <NoteBody body={fields.body} disabled={busy} onChange={(body) => change('body', body)} />
              </Pressable>
            ) : (
              <TextInput value={fields.body} onChangeText={(value) => change('body', value)} multiline autoFocus={editingBody}
                onFocus={() => setEditingBody(true)} onBlur={() => setEditingBody(false)}
                editable={!busy} accessibilityLabel={strings.notes.bodyLabel} style={[inputStyle, styles.body]} testID="note-body" />
            )}
          </Field>
          <Field label={strings.notes.tags}>
            <TagChips tags={allTags([...cards, ...notes, { tags }])} selected={tags} multiple
              onPress={(tag) => {
                if (!tag) return;
                const next = tags.some((value) => sameTag(value, tag)) ? tags.filter((value) => !sameTag(value, tag)) : [...tags, tag];
                if (next.length > MAX_TAGS) { Alert.alert(strings.tags.tooManyTitle, strings.notes.tooManyTags(MAX_TAGS)); return; }
                void changeTags(next);
              }} onAddNew={() => setNamingTag(true)} wrap />
            {namingTag && <TagNameInput tags={allTags([...cards, ...notes])} onCancel={() => setNamingTag(false)} onSubmit={(tag) => {
              if (tags.length >= MAX_TAGS && !tags.some((value) => sameTag(value, tag))) {
                Alert.alert(strings.tags.tooManyTitle, strings.notes.tooManyTags(MAX_TAGS));
                return;
              }
              setNamingTag(false);
              void changeTags(normalizeTags([...tags, tag]));
            }} />}
          </Field>
          <Field label={strings.notes.linkedDocument}>
            <ChipRow accessibilityLabel={strings.notes.linkedDocument} chips={[
              { key: 'none', label: strings.notes.noDocument, selected: documentId === null, onPress: () => setDocumentId(null) },
              ...cards.map((card) => ({ key: card.id, label: card.name || strings.card.unnamed, selected: documentId === card.id, onPress: () => setDocumentId(card.id) })),
            ]} />
          </Field>
          <LiveText style={{ color: status === 'error' || actionFailed ? theme.danger : theme.muted }} testID="note-status">
            {status === 'error' || actionFailed ? strings.notes.failed : isBlankNote(fields) ? strings.notes.blank : status === 'saving' ? strings.notes.saving : strings.notes.saved}
          </LiveText>
          {(status === 'error' || actionFailed) && <Button variant="secondary" label={strings.notes.retry} onPress={() => {
            setActionFailed(false);
            void editor.flush().catch(() => {});
          }} />}
          <NoteReminder value={reminderAt} disabled={busy || isBlankNote(fields)} onSave={async (at) => {
            setBusy(true);
            try {
              if (at !== null && !(await requestReminderPermissionOnce())) throw new Error('permission-denied');
              await editor.flush();
              await services.notes.setReminder(editor.id, at);
              setReminderAt(at ?? undefined);
              await refresh();
            } finally { setBusy(false); }
          }} />
          <View style={styles.secondary}>
            <Button variant="secondary" label={strings.notes.share} onPress={() => transfer('share')}
              disabled={busy || isBlankNote(fields)} testID="note-share" />
            <Button variant="secondary" label={strings.notes.copy} onPress={() => transfer('copy')}
              disabled={busy || !fields.body} testID="note-copy" />
            {transferStatus && <LiveText style={{ color: theme.muted }}>{transferStatus}</LiveText>}
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
  content: { padding: 16, gap: 16, flexGrow: 1 },
  body: { minHeight: 240, textAlignVertical: 'top', fontSize: TYPE.body },
  secondary: { gap: 16, marginTop: 16 },
  actions: { padding: 16 },
});

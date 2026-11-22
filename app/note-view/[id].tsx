import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/app/AppProvider';
import { NoteBody } from '../../src/notes/NoteBody';
import { spaceFor } from '../../src/spaces/spaces';
import { strings } from '../../src/strings';
import { formatAgo } from '../../src/time/dates';
import { Button } from '../../src/ui/Button';
import { ShowcasePin } from '../../src/showcase/ShowcaseLibrary';
import { RetroIcon } from '../../src/ui/RetroIcon';
import { ActionFooter, Screen } from '../../src/ui/Surface';
import { Text } from '../../src/ui/Text';
import { RADIUS, TYPE, useTheme } from '../../src/ui/theme';

export default function NoteDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { cards, notes, services, refresh } = useApp();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const note = notes.find((item) => item.id === id);
  if (!note) return <Screen><Text style={[styles.missing, { color: theme.text }]}>{strings.notes.missing}</Text></Screen>;
  const space = spaceFor(note.spaceId);
  const linked = cards.find((card) => card.id === note.documentId);
  const act = async (action: () => Promise<unknown>, leave = false) => {
    setBusy(true);
    setFailed(false);
    try {
      await action();
      if (leave) router.back();
      await refresh();
    } catch { setFailed(true); }
    finally { setBusy(false); }
  };
  const remove = () => Alert.alert(strings.notes.deleteTitle, strings.notes.deleteBody, [
    { text: strings.common.cancel, style: 'cancel' },
    { text: strings.common.delete, style: 'destructive', onPress: () => void act(() => services.notes.remove(note.id), true) },
  ]);
  return <Screen>
    <Stack.Screen options={{ title: 'Note' }} />
    <ScrollView contentContainerStyle={styles.content}>
      <View style={[styles.mark, { backgroundColor: theme.showcase.spaces[space.id] }]}><RetroIcon name="note" color={theme.accent} size={32} /></View>
      <Text style={[styles.space, { color: theme.accent }]}>{space.name} space</Text>
      <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{note.title.trim() || strings.notes.untitled}</Text>
      <NoteBody body={note.body} disabled={busy} onChange={(body) => void act(() => services.notes.save(id, { title: note.title, body }))} />
      <Text style={{ color: theme.muted }}>Updated {formatAgo(note.updatedAt, Date.now()).toLowerCase()}</Text>
      {note.reminderAt !== undefined && note.reminderAt > Date.now() && <View style={styles.reminder}>
        <RetroIcon name="expiry" size={20} color={theme.accent} />
        <Text style={{ color: theme.text, flex: 1 }}>{strings.notes.reminderScheduled(new Date(note.reminderAt).toLocaleString())}</Text>
      </View>}
      {note.tags.length > 0 && <Text style={{ color: theme.muted }}>{note.tags.join(' · ')}</Text>}
      {linked && <Button label={linked.name || strings.card.unnamed} variant="secondary" onPress={() => router.push(`/card/${linked.id}`)} />}
      {failed && <Text accessibilityRole="alert" style={{ color: theme.danger }}>{strings.notes.failed}</Text>}
      {/* Away from Edit and Pin in the footer, so it is never pressed by mistake for them. */}
      <View style={[styles.danger, { borderColor: theme.border }]}>
        <Button label={strings.notes.remove} variant="danger" onPress={remove} disabled={busy} />
      </View>
    </ScrollView>
    <ActionFooter testID="note-actions" style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
      <ShowcasePin pinned={note.pinned} disabled={busy} onPress={() => void act(() => services.notes.setPinned(id, !note.pinned))} />
      <View style={styles.action}><Button label={strings.notes.editTitle} onPress={() => router.push(`/note/${id}`)} disabled={busy} /></View>
    </ActionFooter>
  </Screen>;
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 16 },
  missing: { padding: 20 },
  mark: { width: 64, height: 64, borderRadius: RADIUS.control, alignItems: 'center', justifyContent: 'center' },
  space: { fontSize: TYPE.secondary, fontWeight: '600' },
  title: { fontSize: TYPE.title, fontWeight: '700' },
  footer: { padding: 12, gap: 8, flexDirection: 'row', alignItems: 'center' },
  action: { flex: 1 },
  reminder: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  danger: { marginTop: 24, paddingTop: 24, borderTopWidth: StyleSheet.hairlineWidth },
});

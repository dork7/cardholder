import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShowcaseHeader, ShowcaseIcon, useShowcaseAdd } from '../src/showcase/ShowcaseActions';
import { spaceFor } from '../src/spaces/spaces';
import { ShowcasePin } from '../src/showcase/ShowcaseLibrary';
import { useApp } from '../src/app/AppProvider';
import { NoteBody } from '../src/notes/NoteBody';
import { findNotes, Note } from '../src/notes/noteStore';
import { allTags } from '../src/cards/tags';
import { TagChips } from '../src/ui/TagChips';
import { strings } from '../src/strings';
import { Button } from '../src/ui/Button';
import { useInputStyle } from '../src/ui/Field';
import { Screen } from '../src/ui/Surface';
import { Fab } from '../src/ui/Fab';
import { TabBar } from '../src/ui/TabBar';
import { Text } from '../src/ui/Text';
import { LiveText } from '../src/ui/LiveText';
import { TRACKING, TYPE, useTheme } from '../src/ui/theme';
import { useDebouncedQuery } from '../src/ui/useDebouncedQuery';

export default function NotesScreen() {
  const { services, refresh } = useApp();
  const router = useRouter();
  const theme = useTheme();
  const inputStyle = useInputStyle();
  const add = useShowcaseAdd();
  const insets = useSafeAreaInsets();
  const [notes, setNotes] = useState<Note[]>([]);
  const [query, setQuery] = useState('');
  const settledQuery = useDebouncedQuery(query);
  const searchPending = query.trim() !== settledQuery.trim();
  const [tag, setTag] = useState<string | null>(null);
  const presentTags = allTags(notes);
  const activeTag = tag && presentTags.some((value) => value.toLocaleLowerCase() === tag.toLocaleLowerCase()) ? tag : null;
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const load = useCallback(async () => {
    setFailed(false);
    try { setNotes(await services.notes.list()); }
    catch { setFailed(true); }
    finally { setLoading(false); }
  }, [services]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const toggleTask = async (note: Note, body: string) => {
    setSaving(true);
    setSaveFailed(false);
    try {
      await services.notes.save(note.id, { title: note.title, body });
      setNotes(await services.notes.list());
    } catch { setSaveFailed(true); }
    finally { setSaving(false); }
  };
  const filtered = findNotes(notes, settledQuery, activeTag);
  const pinnedCount = filtered.filter((note) => note.pinned).length;
  const pin = async (note: Note) => {
    setSaving(true);
    setSaveFailed(false);
    try {
      await services.notes.setPinned(note.id, !note.pinned);
      await load();
      await refresh();
    } catch { setSaveFailed(true); }
    finally { setSaving(false); }
  };
  return (
    <Screen style={{ paddingTop: insets.top }}>
      <ShowcaseHeader title={strings.notes.title}>
        <ShowcaseIcon icon="settings" label={strings.home.settings} onPress={() => router.push('/settings')} />
      </ShowcaseHeader>
      <View style={styles.search}>
        <TextInput value={query} onChangeText={setQuery} accessibilityLabel={strings.notes.search}
          placeholder={strings.notes.search} placeholderTextColor={theme.muted}
          autoCorrect={false} autoCapitalize="none" style={inputStyle} testID="notes-search" />
      </View>
      {presentTags.length > 0 && <TagChips tags={presentTags} selected={activeTag ? [activeTag] : []} includeAll onPress={setTag} />}
      {saveFailed && <LiveText style={{ color: theme.danger, padding: 16 }}>{strings.notes.failed}</LiveText>}
      {loading ? <ActivityIndicator color={theme.accent} /> : failed ? (
        <View style={styles.search}>
          <LiveText style={{ color: theme.danger }}>{strings.notes.loadFailed}</LiveText>
          <Button label={strings.notes.retry} variant="secondary" onPress={() => void load()} />
        </View>
      ) : (
        <FlatList data={filtered} keyExtractor={(note) => note.id} keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          ListEmptyComponent={<View>
            <LiveText style={[styles.empty, { color: theme.muted }]}>{query.trim() ? (searchPending ? strings.notes.searching : strings.notes.noResults) : strings.notes.empty}</LiveText>
            {!!query.trim() && <Button label={strings.notes.clearSearch} variant="secondary" onPress={() => setQuery('')} />}
          </View>}
          renderItem={({ item, index }) => (
            <View>
              {(index === 0 || index === pinnedCount) && (
                <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>
                  {item.pinned ? 'Pinned notes' : 'All notes'}
                </Text>
              )}
              <View style={[styles.row, { borderColor: theme.border }]}>
                <View style={styles.noteHeading}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={item.title.trim() || strings.notes.untitled}
                    onPress={() => router.push(`/note-view/${item.id}`)}
                    testID={`note-${item.id}`}
                    style={({ pressed }) => [styles.noteLink, { backgroundColor: pressed ? theme.glass : undefined }]}
                  >
                    <Text numberOfLines={2} style={[styles.title, { color: theme.text }]}>{item.title.trim() || strings.notes.untitled}</Text>
                    <Text style={[styles.caption, { color: theme.muted }]}>{spaceFor(item.spaceId).name} space</Text>
                    {!!item.tags.length && <Text style={[styles.caption, { color: theme.muted }]}>{item.tags.join(' · ')}</Text>}
                  </Pressable>
                  <ShowcasePin pinned={item.pinned} disabled={saving} onPress={() => void pin(item)} />
                </View>
                {!!item.body && <NoteBody body={item.body} disabled={saving} onChange={(body) => void toggleTask(item, body)} />}
              </View>
            </View>
          )} />
      )}
      <Fab label="Add document or note" onPress={add.open} testID="add-note" />
      {add.sheet}
      <TabBar active="notes" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { paddingHorizontal: 16, paddingBottom: 12, gap: 12 },
  heading: { fontSize: TYPE.section, fontWeight: '700', paddingTop: 12, paddingBottom: 6 },
  noteLink: { flex: 1, minHeight: 48, justifyContent: 'center' },
  noteHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 88, flexGrow: 1 }, // clear of the + button
  row: { paddingVertical: 16, minHeight: 64, borderBottomWidth: StyleSheet.hairlineWidth, gap: 8 },
  title: { fontSize: TYPE.section, fontWeight: '700', letterSpacing: TRACKING.tight },
  body: { fontSize: TYPE.body },
  caption: { fontSize: TYPE.caption },
  empty: { fontSize: TYPE.body, textAlign: 'center', paddingVertical: 32 },
});

import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useApp } from '../src/app/AppProvider';
import { findNotes, Note } from '../src/notes/noteStore';
import { strings } from '../src/strings';
import { Button } from '../src/ui/Button';
import { Field, useInputStyle } from '../src/ui/Field';
import { Screen } from '../src/ui/Surface';
import { Fab } from '../src/ui/Fab';
import { TabBar } from '../src/ui/TabBar';
import { Text } from '../src/ui/Text';
import { LiveText } from '../src/ui/LiveText';
import { TRACKING, TYPE, useTheme } from '../src/ui/theme';

export default function NotesScreen() {
  const { services } = useApp();
  const router = useRouter();
  const theme = useTheme();
  const inputStyle = useInputStyle();
  const [notes, setNotes] = useState<Note[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => {
    setFailed(false);
    try { setNotes(await services.notes.list()); }
    catch { setFailed(true); }
    finally { setLoading(false); }
  }, [services]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  return (
    <Screen>
      <View style={styles.search}>
        <Field label={strings.notes.search}>
          <TextInput value={query} onChangeText={setQuery} accessibilityLabel={strings.notes.search}
            placeholder={strings.notes.search} placeholderTextColor={theme.muted}
            autoCorrect={false} autoCapitalize="none" style={inputStyle} testID="notes-search" />
        </Field>
      </View>
      {loading ? <ActivityIndicator color={theme.accent} /> : failed ? (
        <View style={styles.search}>
          <LiveText style={{ color: theme.danger }}>{strings.notes.loadFailed}</LiveText>
          <Button label={strings.notes.retry} variant="secondary" onPress={() => void load()} />
        </View>
      ) : (
        <FlatList data={findNotes(notes, query)} keyExtractor={(note) => note.id} keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          ListEmptyComponent={<LiveText style={[styles.empty, { color: theme.muted }]}>{notes.length ? strings.notes.noResults : strings.notes.empty}</LiveText>}
          renderItem={({ item }) => (
            <Pressable accessibilityRole="button" accessibilityLabel={item.title.trim() || strings.notes.untitled}
              onPress={() => router.push(`/note/${item.id}`)} testID={`note-${item.id}`}
              style={({ pressed }) => [styles.row, { borderColor: theme.border, backgroundColor: pressed ? theme.surface : theme.bg }]}>
              {item.pinned && <Text style={[styles.caption, { color: theme.muted }]}>{strings.notes.pinned}</Text>}
              <Text numberOfLines={2} style={[styles.title, { color: theme.text }]}>{item.title.trim() || strings.notes.untitled}</Text>
              {!!item.body && <Text numberOfLines={3} style={[styles.body, { color: theme.muted }]}>{item.body}</Text>}
            </Pressable>
          )} />
      )}
      <Fab label={strings.notes.add} onPress={() => router.push('/note/new')} testID="add-note" />
      <TabBar active="notes" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { padding: 16, gap: 12 },
  list: { paddingHorizontal: 16, paddingBottom: 88, flexGrow: 1 }, // clear of the + button
  row: { paddingVertical: 16, minHeight: 64, borderBottomWidth: StyleSheet.hairlineWidth, gap: 8 },
  title: { fontSize: TYPE.section, fontWeight: '700', letterSpacing: TRACKING.tight },
  body: { fontSize: TYPE.body },
  caption: { fontSize: TYPE.caption },
  empty: { fontSize: TYPE.body, textAlign: 'center', paddingVertical: 32 },
});

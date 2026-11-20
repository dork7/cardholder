import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../src/app/AppProvider';
import { useDocumentSearch } from '../src/cards/useDocumentSearch';
import { findNotes } from '../src/notes/noteStore';
import { ShowcaseAdd, ShowcaseHeader, ShowcaseIcon } from '../src/showcase/ShowcaseActions';
import { EmptySection, ShowcaseDocumentRow, ShowcaseNoteRow, ShowcaseSectionHeading, SpaceCarousel } from '../src/showcase/ShowcaseLibrary';
import { spaceFor } from '../src/spaces/spaces';
import { useInputStyle } from '../src/ui/Field';
import { Screen } from '../src/ui/Surface';
import { TabBar } from '../src/ui/TabBar';
import { RADIUS, useTheme } from '../src/ui/theme';
import { useDebouncedQuery } from '../src/ui/useDebouncedQuery';

export default function SpacesScreen() {
  const { cards, folders, notes } = useApp();
  const { space } = useLocalSearchParams<{ space?: string }>();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const inputStyle = useInputStyle();
  const selected = spaceFor(space);
  const [query, setQuery] = useState('');
  const settled = useDebouncedQuery(query);
  const documents = useDocumentSearch(cards, folders, settled).filter((card) => spaceFor(card.spaceId).id === selected.id);
  const spaceNotes = findNotes(notes, settled).filter((note) => spaceFor(note.spaceId).id === selected.id);
  return <Screen style={{ paddingTop: insets.top }}>
    <ShowcaseHeader title="Your spaces">
      <ShowcaseIcon icon="settings" label="Settings" onPress={() => router.push('/settings')} />
    </ShowcaseHeader>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <SpaceCarousel cards={cards} notes={notes} selected={selected.id}
        onSelect={(id) => { setQuery(''); router.setParams({ space: id }); }} />
      <ShowcaseSectionHeading title={selected.name} />
      <TextInput accessibilityLabel="Search this space" placeholder="Search this space" placeholderTextColor={theme.muted}
        value={query} onChangeText={setQuery} style={inputStyle} testID="space-search" />
      <View style={[styles.group, { backgroundColor: theme.glassStrong }]}>
        <ShowcaseSectionHeading title="Documents" />
        {documents.length ? documents.map((card) => <ShowcaseDocumentRow key={card.id} card={card} />) :
          <EmptySection>{query ? 'No matching documents.' : 'No documents in this space yet.'}</EmptySection>}
      </View>
      <View style={[styles.group, { backgroundColor: theme.glassStrong }]}>
        <ShowcaseSectionHeading title="Notes" />
        {spaceNotes.length ? spaceNotes.map((note) => <ShowcaseNoteRow key={note.id} note={note} />) :
          <EmptySection>{query ? 'No matching notes.' : 'No notes in this space yet.'}</EmptySection>}
      </View>
    </ScrollView>
    <ShowcaseAdd spaceId={selected.id} />
    <TabBar active="spaces" />
  </Screen>;
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 88 },
  group: { padding: 16, borderRadius: RADIUS.lg, gap: 4 },
});

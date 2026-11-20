import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useApp } from '../app/AppProvider';
import { displayName } from '../cards/display';
import { Card } from '../cards/types';
import { useCardImage } from '../hooks/useCardImage';
import { Note } from '../notes/noteStore';
import { SPACES, SpaceId, spaceFor } from '../spaces/spaces';
import { strings } from '../strings';
import { CardPicture } from '../ui/CardPicture';
import { RetroIcon } from '../ui/RetroIcon';
import { Text } from '../ui/Text';
import { RADIUS, TYPE, useTheme } from '../ui/theme';
import { showError } from '../ui/errorAlert';
import { ShowcaseIcon } from './ShowcaseActions';

export function DocumentArtwork({ card }: { card: Card }) {
  const uri = useCardImage(card, 'thumb');
  const theme = useTheme();
  return <View style={[styles.artwork, { backgroundColor: theme.showcase.spaces[spaceFor(card.spaceId).id] }]}>
    {uri ? <CardPicture uri={uri} vertical={card.vertical} blurPreview={card.blurPreview} /> : <RetroIcon name="documents" color={theme.accent} />}
  </View>;
}

export function ShowcaseDocumentRow({ card, subtitle }: { card: Card; subtitle?: string }) {
  const { services, refresh } = useApp();
  const theme = useTheme();
  const router = useRouter();
  const name = displayName(card);
  const pin = () => void services.store.setPinned(card.id, !card.pinned).then(refresh).catch(() => showError(card.pinned ? 'unpin' : 'pin', null));
  return <View style={[styles.row, { borderColor: theme.border }]}>
    <Pressable style={styles.rowLink} accessibilityRole="button" accessibilityLabel={name} onPress={() => router.push(`/card/${card.id}`)}>
      <View style={styles.thumb}><DocumentArtwork card={card} /></View>
      <RowText name={name} spaceId={card.spaceId} subtitle={subtitle} />
    </Pressable>
    <ShowcasePin pinned={card.pinned} onPress={pin} />
  </View>;
}

export function ShowcaseNoteRow({ note }: { note: Note }) {
  const { services, refresh } = useApp();
  const theme = useTheme();
  const router = useRouter();
  const name = note.title.trim() || strings.notes.untitled;
  const pin = () => void services.notes.setPinned(note.id, !note.pinned).then(refresh).catch(() => showError(note.pinned ? 'unpin' : 'pin', null));
  return <View style={[styles.row, { borderColor: theme.border }]}>
    <Pressable style={styles.rowLink} accessibilityRole="button" accessibilityLabel={name} onPress={() => router.push(`/note-view/${note.id}`)}>
      <View style={[styles.thumb, styles.noteIcon, { backgroundColor: theme.showcase.spaces[spaceFor(note.spaceId).id] }]}>
        <RetroIcon name="note" color={theme.accent} />
      </View>
      <RowText name={name} spaceId={note.spaceId} />
    </Pressable>
    <ShowcasePin pinned={note.pinned} onPress={pin} />
  </View>;
}

export function ShowcasePin({ pinned, onPress, disabled = false }: { pinned: boolean; onPress(): void; disabled?: boolean }) {
  const theme = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={pinned ? strings.card.unpin : strings.card.pin}
    accessibilityState={{ selected: pinned, disabled }} disabled={disabled} onPress={onPress} style={styles.pin}>
    <RetroIcon name="pin" size={20} color={pinned ? theme.accent : theme.muted} />
  </Pressable>;
}

function RowText({ name, spaceId, subtitle }: { name: string; spaceId?: SpaceId; subtitle?: string }) {
  const theme = useTheme();
  return <View style={styles.rowCopy}>
    <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={2}>{name}</Text>
    <Text style={{ color: theme.muted, fontSize: TYPE.secondary }}>{spaceFor(spaceId).name} space</Text>
    {!!subtitle && <Text style={{ color: theme.muted, fontSize: TYPE.caption }}>{subtitle}</Text>}
  </View>;
}

export function ShowcaseSectionHeading({ title, onPress }: { title: string; onPress?: () => void }) {
  const theme = useTheme();
  return <View style={styles.sectionHeading}>
    <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
    {onPress && <ShowcaseIcon icon="arrow" label={`View ${title.toLowerCase()}`} onPress={onPress} />}
  </View>;
}

export function EmptySection({ children }: { children: string }) {
  const theme = useTheme();
  return <Text style={[styles.empty, { color: theme.muted }]}>{children}</Text>;
}

export function SpaceCarousel({ cards, notes, selected, onSelect }: {
  cards: readonly Card[];
  notes: readonly Note[];
  selected?: SpaceId;
  onSelect(id: SpaceId): void;
}) {
  const theme = useTheme();
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.spaces} testID="space-carousel">
    {SPACES.map(({ id, name }) => {
      const documents = cards.filter((card) => spaceFor(card.spaceId).id === id).length;
      const noteCount = notes.filter((note) => spaceFor(note.spaceId).id === id).length;
      return <Pressable key={id} testID={`browse-space-${id}`} accessibilityRole="button" accessibilityState={{ selected: selected === id }}
        onPress={() => onSelect(id)} style={styles.space}>
        <View style={[styles.spaceBack, { backgroundColor: theme.showcase.spaces[id] }]} />
        <View style={[styles.spaceFront, { backgroundColor: theme.showcase.spaces[id], borderColor: selected === id ? theme.accent : theme.border }]}>
          <RetroIcon name="folder" color={theme.accent} />
          <Text style={[styles.rowTitle, { color: theme.text }]}>{name}</Text>
          <Text style={{ color: theme.text, fontSize: TYPE.caption }}>{strings.home.documentCount(documents)}, {noteCount} {noteCount === 1 ? 'note' : 'notes'}</Text>
        </View>
      </Pressable>;
    })}
  </ScrollView>;
}

const styles = StyleSheet.create({
  artwork: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  row: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 7 },
  rowLink: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  thumb: { width: 48, height: 48, borderRadius: RADIUS.sm, overflow: 'hidden' },
  noteIcon: { alignItems: 'center', justifyContent: 'center' },
  rowCopy: { flex: 1, gap: 2 },
  pin: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: TYPE.body, fontWeight: '700' },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  sectionTitle: { flex: 1, fontSize: TYPE.section + 2, fontWeight: '700' },
  empty: { paddingVertical: 12, fontSize: TYPE.secondary },
  spaces: { gap: 12, paddingVertical: 10 },
  space: { width: 148, paddingTop: 8, paddingEnd: 5 },
  spaceBack: { position: 'absolute', top: 0, start: 7, end: 0, bottom: 8, borderRadius: RADIUS.md, transform: [{ rotate: '3deg' }], opacity: 0.68 },
  spaceFront: { flex: 1, gap: 6, padding: 12, minHeight: 111, borderRadius: RADIUS.md, borderWidth: 1 },
});

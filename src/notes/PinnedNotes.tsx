import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { strings } from '../strings';
import { RetroIcon } from '../ui/RetroIcon';
import { Text } from '../ui/Text';
import { RADIUS, TYPE, useTheme } from '../ui/theme';

// Accept only titles and opaque IDs: a home tile must never derive a preview from note text.
export function PinnedNotes({ notes, compact = false, onOpen }: {
  notes: readonly { id: string; title: string }[];
  compact?: boolean;
  onOpen(id: string): void;
}) {
  const theme = useTheme();
  if (!notes.length) return null;
  const tiles = notes.map((note) => {
    const title = note.title.trim() || strings.notes.untitled;
    return <Pressable key={note.id} testID={`pinned-note-${note.id}`} accessibilityRole="button"
      accessibilityLabel={strings.notes.open(title)} onPress={() => onOpen(note.id)}
      style={({ pressed }) => [styles.tile, compact && styles.compact, {
        backgroundColor: pressed ? theme.bannerBg : theme.surface, borderColor: theme.border,
      }]}>
      <RetroIcon name="note" size={24} />
      <View style={styles.words}>
        <Text numberOfLines={2} style={{ color: theme.text, fontSize: TYPE.body, fontWeight: '600' }}>{title}</Text>
        <Text style={{ color: theme.muted, fontSize: TYPE.caption }}>{strings.notes.tileKind}</Text>
      </View>
    </Pressable>;
  });
  return compact ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tiles} style={styles.strip}>{tiles}</ScrollView>
    : <View style={styles.tiles}>{tiles}</View>;
}

const styles = StyleSheet.create({
  tiles: { gap: 12 },
  strip: { flexGrow: 0, marginBottom: 12 },
  tile: { minHeight: 72, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: StyleSheet.hairlineWidth, borderRadius: RADIUS.sm },
  compact: { width: 200 },
  words: { flex: 1, gap: 4 },
});

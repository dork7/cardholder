import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useApp } from '../src/app/AppProvider';
import { removeTagEverywhere } from '../src/cards/batch';
import { allTags, cardsWithTag } from '../src/cards/tags';
import { strings } from '../src/strings';
import { Button } from '../src/ui/Button';
import { Panel, Screen } from '../src/ui/Surface';
import { Text } from '../src/ui/Text';
import { TYPE, useTheme } from '../src/ui/theme';

// Every tag in use, and how many cards have it. Deleting one takes it off those cards; the cards are
// kept. New tags are made where a card is tagged: its edit screen, its own screen, or the gallery.
export default function TagsScreen() {
  const { services, cards, refresh } = useApp();
  const theme = useTheme();
  const [busy, setBusy] = useState(false);
  const tags = allTags(cards);

  const remove = async (tag: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const failed = await removeTagEverywhere(services.store, cards, tag);
      if (failed > 0) Alert.alert(strings.common.error, strings.tagsScreen.deleteFailed(failed));
    } finally {
      setBusy(false);
      await refresh().catch((e) => console.warn('Refresh after deleting a tag failed', e));
    }
  };

  const confirmDelete = (tag: string) =>
    Alert.alert(strings.tagsScreen.deleteConfirmTitle(tag), strings.tagsScreen.deleteConfirmBody(cardsWithTag(tag, cards).length), [
      { text: strings.common.cancel, style: 'cancel' },
      { text: strings.common.delete, style: 'destructive', onPress: () => void remove(tag) },
    ]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.caption, styles.intro, { color: theme.muted }]}>{strings.tagsScreen.intro}</Text>
        {tags.length === 0 && (
          <Text style={[styles.caption, styles.intro, { color: theme.muted }]} testID="no-tags">
            {strings.tagsScreen.empty}
          </Text>
        )}
        {tags.map((tag) => (
          <Panel key={tag} style={styles.row}>
            <View style={styles.text}>
              <Text style={[styles.title, { color: theme.text }]}>{tag}</Text>
              <Text style={[styles.caption, { color: theme.muted }]}>{strings.folders.count(cardsWithTag(tag, cards).length)}</Text>
            </View>
            <Button
              variant="danger"
              label={strings.common.delete}
              onPress={() => confirmDelete(tag)}
              disabled={busy}
              testID={`delete-tag-${tag}`}
            />
          </Panel>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  intro: { paddingHorizontal: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  text: { flex: 1, gap: 4 },
  title: { fontSize: TYPE.body, fontWeight: '700' },
  caption: { fontSize: TYPE.secondary },
});

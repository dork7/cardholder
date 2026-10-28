import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useApp } from '../src/app/AppProvider';
import { cardsInCategory, categoryLabel } from '../src/cards/categories';
import { CategoryInUseError } from '../src/cards/cardStore';
import { displayName } from '../src/cards/display';
import { Card, CardCategory } from '../src/cards/types';
import { strings } from '../src/strings';
import { Button } from '../src/ui/Button';
import { Panel, Screen } from '../src/ui/Surface';
import { Text } from '../src/ui/Text';
import { TYPE, useTheme } from '../src/ui/theme';

// Delete categories. New ones are typed on a card's edit screen. A category some cards still use
// can't be deleted: the error names those cards so they can be moved first.
export default function CategoriesScreen() {
  const { services, cards, categories, refresh } = useApp();
  const theme = useTheme();
  const [busy, setBusy] = useState(false);

  const showInUse = (category: CardCategory, users: Card[]) =>
    Alert.alert(
      strings.categoriesScreen.inUseTitle(categoryLabel(category)),
      strings.categoriesScreen.inUseBody(users.map((c) => displayName(c))),
    );

  const remove = async (category: CardCategory) => {
    if (busy) return;
    setBusy(true);
    try {
      await services.store.removeCategory(category);
    } catch (e) {
      // A card may have moved into it since this screen drew; the store has the last word.
      if (e instanceof CategoryInUseError) showInUse(category, e.cards);
      else {
        console.warn('Deleting the category failed', e);
        Alert.alert(strings.common.error);
      }
    } finally {
      setBusy(false);
      await refresh().catch((e) => console.warn('Refresh after category change failed', e));
    }
  };

  const confirmDelete = (category: CardCategory) => {
    const users = cardsInCategory(category, cards);
    if (users.length > 0) return showInUse(category, users);
    if (categories.length === 1) return Alert.alert(strings.categoriesScreen.keepOne);
    Alert.alert(strings.categoriesScreen.deleteConfirmTitle(categoryLabel(category)), undefined, [
      { text: strings.common.cancel, style: 'cancel' },
      { text: strings.common.delete, style: 'destructive', onPress: () => void remove(category) },
    ]);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.caption, styles.intro, { color: theme.muted }]}>{strings.categoriesScreen.intro}</Text>
        {categories.map((category) => (
          <Panel key={category} style={styles.row}>
            <View style={styles.text}>
              <Text style={[styles.title, { color: theme.text }]}>{categoryLabel(category)}</Text>
              <Text style={[styles.caption, { color: theme.muted }]}>
                {strings.folders.count(cardsInCategory(category, cards).length)}
              </Text>
            </View>
            <Button
              variant="danger"
              label={strings.common.delete}
              onPress={() => confirmDelete(category)}
              disabled={busy}
              testID={`delete-category-${category}`}
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

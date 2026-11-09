import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { lookupIsStale } from '../src/ai/lookup';
import { recreateLookup } from '../src/ai/lookupStore';
import { useApp } from '../src/app/AppProvider';
import { StoredLookup } from '../src/cards/cardStore';
import { shareMarkdown } from '../src/share/shareCard';
import { strings } from '../src/strings';
import { Button } from '../src/ui/Button';
import { Panel, Screen } from '../src/ui/Surface';
import { Text } from '../src/ui/Text';
import { TYPE, useTheme } from '../src/ui/theme';

// The master lookup file that asking reads first (src/ai/lookup.ts): shown as the Markdown it is, with
// whether it still matches the documents, and buttons to make it again or save it as a .md file.
export default function LookupScreen() {
  const { cards, services } = useApp();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [lookup, setLookup] = useState<StoredLookup | null | undefined>(undefined); // undefined while loading
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    services.store
      .loadLookup()
      .then((saved) => live && setLookup(saved))
      .catch((e) => {
        console.warn('Loading the lookup file failed', e);
        if (live) setLookup(null);
      });
    return () => {
      live = false;
    };
  }, [services]);

  const recreate = useCallback(async () => {
    setBusy(true);
    try {
      setLookup(await recreateLookup(services.store, cards));
    } catch (e) {
      console.warn('Making the lookup file failed', e);
      Alert.alert(strings.common.error);
    } finally {
      setBusy(false);
    }
  }, [services, cards]);

  const save = () =>
    lookup &&
    shareMarkdown(strings.lookup.title, lookup.markdown).catch((e) => {
      console.warn('Saving the lookup file failed', e);
      Alert.alert(strings.common.error);
    });

  if (lookup === undefined) return <Screen>{null}</Screen>;
  const stale = lookup !== null && lookupIsStale(lookup, cards);

  return (
    <Screen style={[styles.screen, { paddingBottom: insets.bottom + 12 }]}>
      {lookup === null ? (
        <Text style={[styles.note, { color: theme.text }]} testID="lookup-none">
          {strings.lookup.none}
        </Text>
      ) : (
        <>
          <Text style={[styles.note, { color: stale ? theme.danger : theme.muted }]} accessibilityLiveRegion="polite" testID="lookup-status">
            {stale ? strings.lookup.stale : strings.lookup.current}
          </Text>
          <Panel style={styles.panel} radius={24}>
            <ScrollView contentContainerStyle={styles.text}>
              {/* Tables are wide: scroll sideways rather than wrap every row. */}
              <ScrollView horizontal>
                <Text selectable style={[styles.markdown, { color: theme.text }]} testID="lookup-markdown">
                  {lookup.markdown}
                </Text>
              </ScrollView>
            </ScrollView>
          </Panel>
        </>
      )}
      <View style={styles.actions}>
        {lookup !== null && <Button variant="secondary" label={strings.lookup.save} onPress={() => void save()} testID="lookup-save" />}
        <Button
          variant={lookup === null || stale ? 'primary' : 'secondary'}
          label={lookup === null ? strings.lookup.create : strings.lookup.recreate}
          onPress={() => void recreate()}
          disabled={busy}
          testID="lookup-recreate"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 16, gap: 12 },
  note: { fontSize: TYPE.secondary },
  panel: { flex: 1, overflow: 'hidden' },
  text: { padding: 16 },
  markdown: { fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), fontSize: 12, lineHeight: 18 },
  actions: { gap: 10 },
});

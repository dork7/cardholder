import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/app/AppProvider';
import { useMaxBrightness } from '../../src/hooks/useMaxBrightness';
import { ZoomableImage } from '../../src/ui/ZoomableImage';
import { Button } from '../../src/ui/Button';
import { IconButton } from '../../src/ui/IconButton';
import { Panel, Screen } from '../../src/ui/Surface';
import { Text } from '../../src/ui/Text';
import { useTheme } from '../../src/ui/theme';
import { useCardImage } from '../../src/hooks/useCardImage';
import { displayName } from '../../src/cards/display';
import { shareCardImage } from '../../src/share/shareCard';
import { strings } from '../../src/strings';

export default function CardView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { cards, services, refresh } = useApp();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  useMaxBrightness();

  const card = cards.find((c) => c.id === id);
  // Hooks run on every render; a missing card or back just loads nothing.
  const frontUri = useCardImage(card, 'front');
  const backUri = useCardImage(card?.hasBack ? card : undefined, 'back');

  if (!card) {
    return (
      <Screen style={[styles.padded, { paddingTop: insets.top + 16 }]}>
        <Panel style={styles.padded}>
          <Text style={{ color: theme.text }}>{strings.card.notFound}</Text>
          <Button label={strings.common.close} onPress={() => router.back()} />
        </Panel>
      </Screen>
    );
  }

  const share = () => {
    const go = () =>
      shareCardImage(services.store, card).catch((e) => {
        console.warn('Share failed', e);
        Alert.alert(strings.common.error);
      });
    // An ID is the one card worth a second thought before an unencrypted copy leaves the app.
    if (card.category === 'id') {
      Alert.alert(strings.card.shareIdTitle, strings.card.shareIdBody, [
        { text: strings.common.cancel, style: 'cancel' },
        { text: strings.card.share, onPress: go },
      ]);
    } else {
      go();
    }
  };

  const confirmDelete = () =>
    Alert.alert(strings.edit.deleteConfirmTitle, strings.edit.deleteConfirmBody, [
      { text: strings.common.cancel, style: 'cancel' },
      {
        text: strings.common.delete,
        style: 'destructive',
        onPress: async () => {
          try {
            await services.store.remove(card.id);
          } catch (e) {
            console.warn('Delete failed', e);
            Alert.alert(strings.common.error);
            return;
          }
          await refresh().catch((e) => console.warn('Refresh after delete failed', e));
          router.back();
        },
      },
    ]);

  const sides = [{ label: strings.card.front, uri: frontUri }];
  if (card.hasBack) sides.push({ label: strings.card.back, uri: backUri });

  return (
    <Screen style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8, gap: 16 }}>
      <View style={styles.inset}>
        <Panel style={styles.header} radius={24}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1} accessibilityRole="header">
            {displayName(card)}
          </Text>
        </Panel>
      </View>

      {/* The photos sit straight on the page: the card is the card, panels are only the chrome. */}
      <View style={[styles.inset, styles.sides]}>
        {sides.map((side) => (
          <View key={side.label} style={styles.side}>
            <Text style={{ fontSize: 14, color: theme.muted, textAlign: 'center' }}>{side.label}</Text>
            <View style={styles.frame}>
              <ZoomableImage uri={side.uri} accessibilityLabel={strings.card.imageLabel(displayName(card), side.label)} />
            </View>
          </View>
        ))}
      </View>

      {/* Every action in the thumb zone: the card's actions as icons in a row, and Close, the one
          you need most, full width at the bottom. Delete asks first. */}
      <View style={styles.inset}>
        <Panel style={styles.footer} radius={28}>
          <View style={styles.actions}>
            <IconButton icon="trash" variant="danger" label={strings.edit.deleteCard} onPress={confirmDelete} testID="delete-card" />
            <IconButton icon="share" label={strings.card.share} onPress={share} testID="share-card" />
            <IconButton icon="edit" label={strings.card.edit} onPress={() => router.push(`/edit/${card.id}`)} testID="edit-card" />
          </View>
          <Button label={strings.common.close} onPress={() => router.back()} testID="close-card" />
        </Panel>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  padded: { padding: 16, gap: 12 },
  inset: { paddingHorizontal: 16 },
  header: { paddingHorizontal: 20, paddingVertical: 12 },
  title: { fontSize: 21, fontWeight: '700' },
  sides: { flex: 1, gap: 16 },
  side: { flex: 1, gap: 4 },
  frame: { flex: 1 },
  footer: { gap: 12, padding: 12 },
  actions: { flexDirection: 'row', gap: 12 },
});

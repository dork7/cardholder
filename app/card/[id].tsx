import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';
import * as Sharing from 'expo-sharing';
import { useApp } from '../../src/app/AppProvider';
import { useMaxBrightness } from '../../src/hooks/useMaxBrightness';
import { ZoomableImage } from '../../src/ui/ZoomableImage';
import { Button } from '../../src/ui/Button';
import { Text } from '../../src/ui/Text';
import { useTheme } from '../../src/ui/theme';
import { useCardImage } from '../../src/hooks/useCardImage';
import { displayName } from '../../src/cards/display';
import { strings } from '../../src/strings';

export default function CardView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { cards, services, refresh } = useApp();
  const router = useRouter();
  const theme = useTheme();

  useMaxBrightness();

  const card = cards.find((c) => c.id === id);
  // Hooks run on every render; a missing card or back just loads nothing.
  const frontUri = useCardImage(card, 'front');
  const backUri = useCardImage(card?.hasBack ? card : undefined, 'back');

  if (!card) {
    return (
      <View style={[styles.container, styles.padded, { backgroundColor: theme.bg }]}>
        <Text style={{ color: theme.text }}>{strings.card.notFound}</Text>
        <Button label={strings.common.close} onPress={() => router.back()} />
      </View>
    );
  }

  const share = async () => {
    if (!frontUri) return;
    try {
      await Sharing.shareAsync(frontUri);
    } catch {
      Alert.alert(strings.common.error);
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
            await refresh();
            router.replace('/');
          } catch {
            Alert.alert(strings.common.error);
          }
        },
      },
    ]);

  const sides = [{ label: strings.card.front, uri: frontUri }];
  if (card.hasBack) sides.push({ label: strings.card.back, uri: backUri });

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.header}>
        <Button variant="secondary" label={strings.common.close} onPress={() => router.back()} />
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1} accessibilityRole="header">
          {displayName(card)}
        </Text>
      </View>

      <View style={styles.sides}>
        {sides.map((side) => (
          <View key={side.label} style={styles.side}>
            <Text style={{ fontSize: 14, color: theme.muted }}>{side.label}</Text>
            <View style={styles.frame}>
              <ZoomableImage uri={side.uri} accessibilityLabel={strings.card.imageLabel(displayName(card), side.label)} />
            </View>
          </View>
        ))}
      </View>

      <View style={[styles.padded, styles.footer]}>
        <Button variant="secondary" label={strings.card.share} onPress={share} />
        <Button variant="danger" label={strings.common.delete} onPress={confirmDelete} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  padded: { padding: 16, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingTop: 50, paddingHorizontal: 16, paddingBottom: 8 },
  title: { flex: 1, fontSize: 21, fontWeight: '700' },
  sides: { flex: 1, paddingHorizontal: 16, gap: 16 },
  side: { flex: 1, gap: 4 },
  frame: { flex: 1 },
  footer: { flexDirection: 'row' },
});

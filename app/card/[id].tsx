import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Sharing from 'expo-sharing';
import { useApp } from '../../src/app/AppProvider';
import { useMaxBrightness } from '../../src/hooks/useMaxBrightness';
import { ZoomableImage } from '../../src/ui/ZoomableImage';
import { Button } from '../../src/ui/Button';
import { GlassPanel, GlassScene } from '../../src/ui/Glass';
import { Text } from '../../src/ui/Text';
import { useTheme } from '../../src/ui/theme';
import { useCardImage } from '../../src/hooks/useCardImage';
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
      <GlassScene style={[styles.padded, { paddingTop: insets.top + 16 }]}>
        <GlassPanel style={styles.padded}>
          <Text style={{ color: theme.text }}>{strings.card.notFound}</Text>
          <Button label={strings.common.close} onPress={() => router.back()} />
        </GlassPanel>
      </GlassScene>
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
    <GlassScene style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8, gap: 16 }}>
      <View style={styles.inset}>
        <GlassPanel style={styles.header} radius={24}>
          <Button variant="secondary" label={strings.common.close} onPress={() => router.back()} />
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1} accessibilityRole="header">
            {card.name}
          </Text>
        </GlassPanel>
      </View>

      {/* The photos sit straight on the backdrop: the card is the card, glass is only the chrome. */}
      <View style={[styles.inset, styles.sides]}>
        {sides.map((side) => (
          <View key={side.label} style={styles.side}>
            <Text style={{ fontSize: 14, color: theme.muted }}>{side.label}</Text>
            <View style={styles.frame}>
              <ZoomableImage uri={side.uri} accessibilityLabel={strings.card.imageLabel(card.name, side.label)} />
            </View>
          </View>
        ))}
      </View>

      <View style={styles.inset}>
        <GlassPanel style={styles.footer} radius={28}>
          <Button variant="secondary" label={strings.card.share} onPress={share} />
          <Button variant="danger" label={strings.common.delete} onPress={confirmDelete} />
        </GlassPanel>
      </View>
    </GlassScene>
  );
}

const styles = StyleSheet.create({
  padded: { padding: 16, gap: 12 },
  inset: { paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 8, paddingRight: 20 },
  title: { flex: 1, fontSize: 21, fontWeight: '700' },
  sides: { flex: 1, gap: 16 },
  side: { flex: 1, gap: 4 },
  frame: { flex: 1 },
  footer: { flexDirection: 'row', gap: 12, padding: 8 },
});

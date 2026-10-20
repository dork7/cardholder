import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, View, Pressable } from 'react-native';
import * as Sharing from 'expo-sharing';
import { useApp } from '../../../src/app/AppProvider';
import { useMaxBrightness } from '../../../src/hooks/useMaxBrightness';
import { ZoomableImage } from '../../../src/ui/ZoomableImage';
import { Button } from '../../../src/ui/Button';
import { Text } from '../../../src/ui/Text';
import { useTheme } from '../../../src/ui/theme';
import { dataUri, useCardImage } from '../../../src/hooks/useCardImage';
import { strings } from '../../../src/strings';
import { Image } from 'expo-image';

// Since I don't have the exact path for Button in the previous steps, 
// I'll check where Button is. It's in ../../../../src/ui/Button.
// Wait, I already saw it in app/edit/[id].tsx.

export default function CardView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { cards, services } = useApp();
  const router = useRouter();
  const theme = useTheme();
  const [side, setSide] = useState<'front' | 'back'>('front');

  useMaxBrightness();

  const card = cards.find((c) => c.id === id);

  if (!card) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <Text style={{ color: theme.text, fontSize: 18 }}>{strings.edit.notFound}</Text>
        <Button label="Back" onPress={() => router.back()} />
      </View>
    );
  }

  const frontUri = useCardImage(card, 'front');
  const backUri = card.hasBack ? useCardImage(card, 'back') : null;

  const currentUri = side === 'front' ? frontUri : backUri;

  const toggleSide = () => {
    if (card.hasBack) {
      setSide((s) => (s === 'front' ? 'back' : 'front'));
    }
  };

  const share = async () => {
    if (!currentUri) return;
    try {
      await Sharing.shareAsync(currentUri);
    } catch (e) {
      Alert.alert(strings.common.error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.header}>
        <Button variant="secondary" label="Back" onPress={() => router.back()} />
        <Text style={[styles.title, { color: theme.text }]}>{card.name}</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.content}>
        <Pressable onPress={toggleSide} style={styles.imageContainer}>
          {currentUri ? (
            <ZoomableImage uri={currentUri} />
          ) : (
            <Text style={{ color: theme.muted }}>No image available</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.footer}>
        <View style={styles.buttonRow}>
          {card.hasBack && (
            <Button variant="secondary" label={side === 'front' ? 'Back' : 'Front'} onPress={toggleSide} />
          )}
          <Button variant="secondary" label="Share" onPress={share} />
        </View>
        <Button variant="danger" label="Delete" onPress={() => {
          Alert.alert(strings.edit.deleteConfirmTitle, strings.edit.deleteConfirmBody, [
            { text: strings.common.cancel, style: 'cancel' },
            {
              text: strings.common.delete,
              style: 'destructive',
              onPress: async () => {
                try {
                  await services.store.remove(card.id);
                  await services.refresh();
                  router.replace('/');
                } catch (e) {
                  Alert.alert(strings.common.error);
                }
              },
            },
          ]);
        }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  title: { fontSize: 20, fontWeight: '700' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  imageContainer: { width: '100%', height: '100%' },
  footer: { padding: 16, gap: 12 },
  buttonRow: { flexDirection: 'row', gap: 12 },
});

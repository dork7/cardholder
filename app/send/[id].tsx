import { useKeepAwake } from 'expo-keep-awake';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/app/AppProvider';
import { displayName } from '../../src/cards/display';
import { TRANSFER_FPS } from '../../src/config';
import { useMaxBrightness } from '../../src/hooks/useMaxBrightness';
import { strings } from '../../src/strings';
import { Transfer } from '../../src/transfer/frames';
import { prepareTransfer } from '../../src/transfer/sendCard';
import { Button } from '../../src/ui/Button';
import { QrCode } from '../../src/ui/QrCode';
import { Panel, Screen } from '../../src/ui/Surface';
import { Text } from '../../src/ui/Text';
import { TYPE, useTheme } from '../../src/ui/theme';

// Plays the card as a stream of QR codes until closed. The other phone can start reading at any
// point; nothing tells this phone it has finished, so the owner closes it.
export default function SendCard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { cards, services } = useApp();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const card = cards.find((c) => c.id === id);
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [failed, setFailed] = useState(false);
  const [seq, setSeq] = useState(0);

  useMaxBrightness();
  useKeepAwake();

  useEffect(() => {
    if (!card) return;
    let live = true;
    prepareTransfer(services.store, card)
      .then((t) => live && setTransfer(t))
      .catch((e) => {
        console.warn('Preparing the transfer failed', e);
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
    // Prepared once per card version; a list refresh elsewhere shouldn't restart the codes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.id, card?.updatedAt, services]);

  useEffect(() => {
    if (!transfer) return;
    const timer = setInterval(() => setSeq((s) => s + 1), 1000 / TRANSFER_FPS);
    return () => clearInterval(timer);
  }, [transfer]);

  const qrSize = Math.min(width - 32, 420);
  // About k frames when every one is caught; a few missed ones add a little.
  const seconds = transfer ? Math.ceil((transfer.k * 1.2) / TRANSFER_FPS / 5) * 5 : 0;

  return (
    <Screen style={[styles.page, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
      <Panel style={styles.header} radius={24}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1} accessibilityRole="header">
          {card ? displayName(card) : strings.transfer.sendTitle}
        </Text>
        <Text style={[styles.steps, { color: theme.muted }]}>{strings.transfer.sendSteps}</Text>
      </Panel>

      <View style={styles.centre}>
        {failed || !card ? (
          <Text style={[styles.body, { color: theme.danger }]} accessibilityLiveRegion="polite">
            {card ? strings.transfer.prepareFailed : strings.card.notFound}
          </Text>
        ) : transfer ? (
          <View accessible accessibilityLabel={strings.transfer.qrLabel} testID="send-qr">
            <QrCode text={transfer.frame(seq)} size={qrSize} />
          </View>
        ) : (
          <Text style={[styles.body, { color: theme.muted }]} accessibilityLiveRegion="polite">
            {strings.transfer.preparing}
          </Text>
        )}
        {transfer && <Text style={[styles.caption, { color: theme.muted }]}>{strings.transfer.sendTime(seconds)}</Text>}
      </View>

      <Panel style={styles.footer} radius={28}>
        <Button label={strings.common.close} onPress={() => router.back()} testID="close-send" />
      </Panel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 16, gap: 16 },
  header: { paddingHorizontal: 20, paddingVertical: 12, gap: 6 },
  title: { fontSize: TYPE.section, fontWeight: '700' },
  steps: { fontSize: TYPE.secondary },
  body: { fontSize: TYPE.body, textAlign: 'center' },
  caption: { fontSize: TYPE.secondary, textAlign: 'center' },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  footer: { padding: 12 },
});

import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../src/app/AppProvider';
import { displayName } from '../src/cards/display';
import { requestReminderPermissionOnce } from '../src/reminders/scheduler';
import { strings } from '../src/strings';
import { decodeCardMessage, TransferError } from '../src/transfer/cardMessage';
import { createReceiveSession } from '../src/transfer/frames';
import { saveReceived } from '../src/transfer/saveReceived';
import { askReplace } from '../src/ui/askReplace';
import { Button } from '../src/ui/Button';
import { Panel, Screen } from '../src/ui/Surface';
import { Text } from '../src/ui/Text';
import { TYPE, useTheme } from '../src/ui/theme';

type Phase =
  | { kind: 'scanning'; progress: number | null } // null until the first code is read
  | { kind: 'saving' }
  | { kind: 'failed'; message: string };

// Reads the QR codes another phone plays (app/send/[id].tsx) and saves the card they carry.
export default function ReceiveCard() {
  const { services, cards, unlocked, refresh } = useApp();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<Phase>({ kind: 'scanning', progress: null });
  const session = useRef(createReceiveSession());
  const finished = useRef(false);

  const restart = () => {
    session.current = createReceiveSession();
    finished.current = false;
    setPhase({ kind: 'scanning', progress: null });
  };

  const finish = useCallback(
    async (message: Uint8Array) => {
      setPhase({ kind: 'saving' });
      try {
        const result = await saveReceived(decodeCardMessage(message), {
          store: services.store,
          cards,
          unlocked,
          askReplace,
          nameOf: displayName,
        });
        if (result.kind === 'cancelled') {
          router.back();
          return;
        }
        if (result.kind === 'limit-reached') {
          router.replace('/paywall');
          return;
        }
        if (result.card.expiresOn) await requestReminderPermissionOnce().catch(() => false);
        await refresh().catch((e) => console.warn('Refresh after receiving failed', e));
        router.replace(`/card/${result.card.id}`);
      } catch (e) {
        console.warn('Receiving a card failed', e);
        setPhase({ kind: 'failed', message: e instanceof TransferError ? strings.transfer.invalid : strings.common.error });
      }
    },
    [services, cards, unlocked, refresh, router],
  );

  const onScanned = useCallback(
    ({ data }: BarcodeScanningResult) => {
      if (finished.current) return;
      const state = session.current.scan(data);
      if (state.kind === 'receiving') {
        const progress = Math.floor(state.progress * 100) / 100;
        setPhase((p) => (p.kind === 'scanning' && p.progress === progress ? p : { kind: 'scanning', progress }));
      } else if (state.kind === 'done') {
        finished.current = true;
        void finish(state.message);
      } else if (state.kind === 'damaged') {
        finished.current = true;
        setPhase({ kind: 'failed', message: strings.transfer.damaged });
      }
    },
    [finish],
  );

  const status =
    phase.kind === 'saving'
      ? strings.transfer.saving
      : phase.kind === 'failed'
        ? phase.message
        : phase.progress === null
          ? strings.transfer.waiting
          : strings.transfer.receiving(Math.round(phase.progress * 100));

  return (
    <Screen style={[styles.page, { paddingBottom: insets.bottom + 8 }]}>
      <Text style={[styles.steps, { color: theme.muted }]}>{strings.transfer.receiveSteps}</Text>

      <View style={[styles.viewfinder, { backgroundColor: theme.surface }]}>
        {permission?.granted ? (
          phase.kind === 'scanning' && (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={onScanned}
              testID="receive-camera"
            />
          )
        ) : (
          <View style={styles.permission}>
            <Text style={[styles.body, { color: theme.text }]}>{strings.transfer.cameraNeeded}</Text>
            {permission && !permission.canAskAgain ? (
              <Button label={strings.transfer.openSettings} onPress={() => void Linking.openSettings()} />
            ) : (
              <Button label={strings.transfer.allowCamera} onPress={() => void requestPermission()} testID="allow-camera" />
            )}
          </View>
        )}
      </View>

      <Panel style={styles.footer} radius={28}>
        <View style={[styles.progressTrack, { backgroundColor: theme.bannerBg }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: theme.accent,
                width: `${phase.kind === 'scanning' ? (phase.progress ?? 0) * 100 : 100}%`,
              },
            ]}
          />
        </View>
        <Text
          style={[styles.body, { color: phase.kind === 'failed' ? theme.danger : theme.text }]}
          accessibilityLiveRegion="polite"
          testID="receive-status"
        >
          {status}
        </Text>
        {phase.kind === 'failed' && <Button label={strings.transfer.tryAgain} onPress={restart} testID="receive-again" />}
        <Button variant="secondary" label={strings.common.close} onPress={() => router.back()} testID="close-receive" />
      </Panel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 16 },
  steps: { fontSize: TYPE.secondary },
  body: { fontSize: TYPE.body, textAlign: 'center' },
  viewfinder: { flex: 1, borderRadius: 24, overflow: 'hidden', justifyContent: 'center' },
  permission: { padding: 24, gap: 16 },
  footer: { padding: 12, gap: 12 },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4 },
});

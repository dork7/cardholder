import { useRouter } from 'expo-router';
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { Platform, ScrollView, StyleSheet } from 'react-native';
import { useApp } from '../src/app/AppProvider';
import { FREE_CARD_LIMIT } from '../src/config';
import { createPurchases, PurchaseMessage } from '../src/purchases/store';
import { strings } from '../src/strings';
import { Button } from '../src/ui/Button';
import { LiveText } from '../src/ui/LiveText';
import { Panel, Screen } from '../src/ui/Surface';
import { Text } from '../src/ui/Text';
import { TYPE, useTheme } from '../src/ui/theme';

const messages: Record<PurchaseMessage, string> = {
  none: strings.settings.restoreNone,
  pending: strings.paywall.pending,
  failed: strings.paywall.failed,
  'price-unavailable': strings.paywall.priceUnavailable,
  unavailable: strings.paywall.unavailable,
  purchased: strings.paywall.purchased,
  'finishing-failed': strings.paywall.finishingFailed,
};

export default function PaywallScreen() {
  const { services, unlocked, refresh } = useApp();
  const router = useRouter();
  const theme = useTheme();
  const purchases = useMemo(() => createPurchases({
    settings: services.settings,
    refresh,
    loadStore: async () => {
      if (Platform.OS !== 'android' && Platform.OS !== 'ios') throw new Error('Unsupported store');
      // A literal lazy require works in Metro and keeps the native module out of app startup.
      const store: typeof import('expo-iap') = require('expo-iap');
      return store;
    },
  }), [services.settings, refresh]);
  const state = useSyncExternalStore(purchases.subscribe, purchases.getSnapshot, purchases.getSnapshot);
  useEffect(() => () => { void purchases.dispose(); }, [purchases]);
  const purchased = unlocked || state.message === 'purchased' || state.message === 'finishing-failed';

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Panel style={styles.panel}>
          <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">{strings.paywall.title}</Text>
          <Text style={[styles.body, { color: theme.text }]}>
            {purchased ? strings.settings.unlocked : strings.paywall.body(FREE_CARD_LIMIT)}
          </Text>
          <Text style={[styles.body, { color: theme.muted }]}>{strings.paywall.keepsDocuments}</Text>
          {!purchased && <>
            <Text style={[styles.body, { color: theme.muted }]}>{strings.paywall.priceHint}</Text>
            {state.price ? (
              <Button label={strings.paywall.buy(state.price)} disabled={state.busy}
                onPress={() => void purchases.buy()} testID="buy-unlimited" />
            ) : (
              <Button label={strings.paywall.checkPrice} disabled={state.busy}
                onPress={() => void purchases.price()} testID="purchase-price" />
            )}
          </>}
          <Button variant="secondary" label={strings.paywall.restore} disabled={state.busy}
            onPress={() => void purchases.restore(Platform.OS)} testID="restore-purchases" />
          {state.busy && <LiveText style={[styles.body, { color: theme.muted }]}>{strings.paywall.loadingPrice}</LiveText>}
          {state.message && <LiveText style={[styles.body, { color: theme.text }]} testID="purchase-message">
            {messages[state.message]}
          </LiveText>}
          <Button variant="secondary" label={strings.paywall.done} onPress={() => router.back()} testID="purchase-done" />
        </Panel>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  panel: { padding: 20, gap: 16 },
  title: { fontSize: TYPE.section, fontWeight: '700' },
  body: { fontSize: TYPE.body },
});

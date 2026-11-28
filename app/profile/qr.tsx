import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useApp } from '../../src/app/AppProvider';
import { displayName } from '../../src/cards/display';
import { useMaxBrightness } from '../../src/hooks/useMaxBrightness';
import { profileVCard } from '../../src/profiles/vcard';
import { strings } from '../../src/strings';
import { Button } from '../../src/ui/Button';
import { Panel, Screen } from '../../src/ui/Surface';
import { Text } from '../../src/ui/Text';
import { useTheme } from '../../src/ui/theme';

// Display only. QR generation is local JS + SVG; no payload is sent to a service.
export default function ProfileQr() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { cards } = useApp();
  const router = useRouter();
  const theme = useTheme();
  const card = cards.find((item) => item.id === id && item.profile);
  useMaxBrightness();
  const qr = card?.profile ? profileVCard(displayName(card), card.profile) : null;
  return <Screen>
    <Stack.Screen options={{ title: strings.profiles.qrTitle }} />
    <View style={styles.content}>
      <Panel style={styles.panel}>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{strings.profiles.qrTitle}</Text>
        {qr && qr.tooLongFields.length === 0 ? <>
          <View style={styles.code}>
            <QRCode value={qr.value} size={260} ecl="L" color="#111111" backgroundColor="#FFFFFF" />
          </View>
          <Text style={[styles.hint, { color: theme.muted }]}>{strings.profiles.qrHint}</Text>
        </> : <Text style={[styles.hint, { color: theme.text }]}>
          {qr ? strings.profiles.qrTooLarge(qr.tooLongFields.join(', ')) : strings.card.notFound}
        </Text>}
        <Button variant="secondary" label={strings.common.close} onPress={() => router.back()} testID="close-profile-qr" />
      </Panel>
    </View>
  </Screen>;
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'center', padding: 16 },
  panel: { padding: 24, alignItems: 'center', gap: 20 },
  title: { fontSize: 24, fontWeight: '700' },
  code: { padding: 12, backgroundColor: '#FFFFFF' },
  hint: { fontSize: 14, textAlign: 'center' },
});

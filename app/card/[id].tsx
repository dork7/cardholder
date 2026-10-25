import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, BackHandler, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/app/AppProvider';
import { useAllowLandscape } from '../../src/hooks/useAllowLandscape';
import { useMaxBrightness } from '../../src/hooks/useMaxBrightness';
import { ZoomableImage } from '../../src/ui/ZoomableImage';
import { Button } from '../../src/ui/Button';
import { IconButton } from '../../src/ui/IconButton';
import { Panel, Screen } from '../../src/ui/Surface';
import { Text } from '../../src/ui/Text';
import { TYPE, useTheme } from '../../src/ui/theme';
import { useCardImage } from '../../src/hooks/useCardImage';
import { displayName } from '../../src/cards/display';
import { expiryLabel, expiryStatus } from '../../src/cards/expiry';
import { TagList } from '../../src/ui/Tags';
import { shareCardImage } from '../../src/share/shareCard';
import { strings } from '../../src/strings';

export default function CardView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { cards, services, refresh } = useApp();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  // Show to staff: the phone is handed over, so nothing on screen may lead anywhere else until the
  // owner holds the finish button. Back, swipe-to-dismiss and every action are off.
  const [staff, setStaff] = useState(false);
  const [holdHint, setHoldHint] = useState(false);

  useMaxBrightness();
  useAllowLandscape();

  useEffect(() => {
    if (!staff) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [staff]);

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

  // An ID gets the same second thought as sharing it: anyone filming the codes gets a copy.
  const sendToPhone = () => {
    const go = () => router.push(`/send/${card.id}`);
    if (card.category === 'id') {
      Alert.alert(strings.transfer.sendIdTitle, strings.transfer.sendIdBody, [
        { text: strings.common.cancel, style: 'cancel' },
        { text: strings.transfer.send, onPress: go },
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

  const togglePin = async () => {
    try {
      await services.store.setPinned(card.id, !card.pinned);
    } catch (e) {
      console.warn('Pin failed', e);
      Alert.alert(strings.common.error);
      return;
    }
    await refresh().catch((e) => console.warn('Refresh after pin failed', e));
  };

  const now = new Date();
  const expiry = expiryStatus(card, now).kind;
  // Expired is the one state worth colour; soon is just brighter than an ordinary date.
  const expiryColor = expiry === 'expired' ? theme.danger : expiry === 'soon' || expiry === 'today' ? theme.text : theme.muted;

  const sides = [{ label: strings.card.front, uri: frontUri }];
  if (card.hasBack) sides.push({ label: strings.card.back, uri: backUri });

  const finishStaff = () => {
    setStaff(false);
    setHoldHint(false);
  };

  const footer = staff ? (
    <Panel style={styles.footer} radius={28}>
      {holdHint && (
        <Text style={[styles.hint, { color: theme.muted }]} accessibilityLiveRegion="polite">
          {strings.card.staffHoldReminder}
        </Text>
      )}
      <Button
        variant="secondary"
        label={strings.card.staffDone}
        accessibilityHint={strings.card.staffDoneHint}
        onPress={() => setHoldHint(true)}
        onLongPress={finishStaff}
        testID="finish-staff"
      />
    </Panel>
  ) : landscape ? (
    // Sideways there's room for the photos or the actions, not both: only Close stays.
    <Panel style={styles.footer} radius={28}>
      <Button label={strings.common.close} onPress={() => router.back()} testID="close-card" />
    </Panel>
  ) : (
    /* Every action in the thumb zone: the card's actions as icons in a row, and Close, the one
       you need most, full width at the bottom. Delete asks first. */
    <Panel style={styles.footer} radius={28}>
      <View style={styles.actions}>
        <IconButton icon="trash" variant="danger" label={strings.edit.deleteCard} onPress={confirmDelete} testID="delete-card" />
        <IconButton icon="share" label={strings.card.share} onPress={share} testID="share-card" />
        <IconButton
          icon="send"
          label={strings.transfer.send}
          hint={strings.transfer.sendHint}
          onPress={sendToPhone}
          testID="send-card"
        />
        <IconButton
          icon={card.pinned ? 'unpin' : 'pin'}
          label={card.pinned ? strings.card.unpin : strings.card.pin}
          onPress={togglePin}
          testID="pin-card"
        />
        <IconButton
          icon="present"
          label={strings.card.showToStaff}
          hint={strings.card.staffHint}
          onPress={() => setStaff(true)}
          testID="show-to-staff"
        />
        <IconButton icon="edit" label={strings.card.edit} onPress={() => router.push(`/edit/${card.id}`)} testID="edit-card" />
      </View>
      <Button label={strings.common.close} onPress={() => router.back()} testID="close-card" />
    </Panel>
  );

  return (
    <Screen
      style={{
        paddingTop: insets.top + 8,
        paddingBottom: insets.bottom + 8,
        paddingLeft: insets.left,
        paddingRight: insets.right,
        gap: landscape ? 8 : 16,
      }}
    >
      <Stack.Screen options={{ gestureEnabled: !staff }} />
      {/* Sideways, the photos get the height; the name and details come back upright. */}
      {!landscape && (
        <View style={styles.inset}>
          <Panel style={styles.header} radius={24}>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={1} accessibilityRole="header">
              {displayName(card)}
            </Text>
            <Text style={[styles.meta, { color: expiryColor }]} testID="card-expiry">
              {expiryLabel(card, now)}
            </Text>
            <TagList tags={card.tags} />
          </Panel>
        </View>
      )}

      {/* The photos sit straight on the page: the card is the card, panels are only the chrome.
          In landscape the front and back sit side by side, for staff who need to see both. */}
      <View style={[styles.inset, styles.sides, landscape && styles.sidesRow]} testID="card-sides">
        {sides.map((side) => (
          <View key={side.label} style={styles.side}>
            <Text style={{ fontSize: 14, color: theme.muted, textAlign: 'center' }}>{side.label}</Text>
            <View style={styles.frame}>
              <ZoomableImage uri={side.uri} accessibilityLabel={strings.card.imageLabel(displayName(card), side.label)} />
            </View>
          </View>
        ))}
      </View>

      <View style={styles.inset}>{footer}</View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  padded: { padding: 16, gap: 12 },
  inset: { paddingHorizontal: 16 },
  header: { paddingHorizontal: 20, paddingVertical: 12, gap: 6 },
  title: { fontSize: TYPE.section, fontWeight: '700' },
  meta: { fontSize: TYPE.secondary, fontWeight: '600' },
  sides: { flex: 1, gap: 16 },
  sidesRow: { flexDirection: 'row' },
  side: { flex: 1, gap: 4 },
  frame: { flex: 1 },
  footer: { gap: 12, padding: 12 },
  // Six icon buttons: an 8 pt gap keeps each at least 44 pt wide on a 375 pt phone.
  actions: { flexDirection: 'row', gap: 8 },
  hint: { fontSize: TYPE.secondary, textAlign: 'center' },
});

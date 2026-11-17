import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useApp } from '../src/app/AppProvider';
import { displayName } from '../src/cards/display';
import { daysLeft } from '../src/cards/recentlyDeleted';
import { DeletedCard } from '../src/cards/types';
import { useCardImage } from '../src/hooks/useCardImage';
import { canAddCard } from '../src/purchases/limits';
import { strings } from '../src/strings';
import { Button } from '../src/ui/Button';
import { showError } from '../src/ui/errorAlert';
import { ConfirmSheet } from '../src/ui/ConfirmSheet';
import { CardPicture } from '../src/ui/CardPicture';
import { CARD_RADIUS, ID1_RATIO } from '../src/ui/stackGeometry';
import { Panel, Screen } from '../src/ui/Surface';
import { Text } from '../src/ui/Text';
import { TYPE, useTheme } from '../src/ui/theme';

const THUMB_W = 64;

// Deleted documents waiting to be erased, most recently deleted first. Restore puts one back exactly as
// it was; it counts toward the free limit again, so at the limit it leads to the upgrade screen instead.
export default function RecentlyDeletedScreen() {
  const { services, cards, unlocked, refresh } = useApp();
  const router = useRouter();
  const theme = useTheme();
  const [deleted, setDeleted] = useState<DeletedCard[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setDeleted(await services.store.listRecentlyDeleted());
    } catch (e) {
      console.warn('Reading Recently deleted failed', e);
      setDeleted([]);
    }
  }, [services]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const restore = async (card: DeletedCard) => {
    if (busy) return;
    if (!canAddCard(cards.length, unlocked)) {
      router.push('/paywall');
      return;
    }
    setBusy(true);
    try {
      await services.store.restore(card.id);
    } catch (e) {
      console.warn('Restore failed', e);
      showError('restore', e);
    } finally {
      await refresh().catch((e) => console.warn('Refresh after restore failed', e));
      await load();
      setBusy(false);
    }
  };

  // Erasing is the one step here that can't be undone, so it always asks first.
  const erase = async (action: 'erase' | 'emptyRecentlyDeleted', run: () => Promise<void>) => {
    setBusy(true);
    try {
      await run();
    } catch (e) {
      console.warn('Erasing failed', e);
      showError(action, e);
    } finally {
      await load();
      setBusy(false);
    }
  };

  // One confirmation sheet for both erasing steps; Cancel, the backdrop and hardware back keep everything.
  const [confirming, setConfirming] = useState<{ title: string; body: string; label: string; go: () => void } | null>(null);

  const confirmDeleteNow = (card: DeletedCard) => {
    if (busy) return;
    setConfirming({
      title: strings.recentlyDeleted.deleteNowTitle(displayName(card)),
      body: strings.recentlyDeleted.deleteNowBody,
      label: strings.recentlyDeleted.deleteNow,
      go: () => void erase('erase', () => services.store.erase(card.id)),
    });
  };

  const confirmEmpty = () => {
    if (busy || !deleted?.length) return;
    setConfirming({
      title: strings.recentlyDeleted.emptyTitle,
      body: strings.recentlyDeleted.emptyBody(deleted.length),
      label: strings.recentlyDeleted.emptyAction,
      go: () => void erase('emptyRecentlyDeleted', () => services.store.eraseRecentlyDeleted()),
    });
  };

  const now = Date.now();
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        {deleted !== null && deleted.length === 0 ? (
          <Text style={[styles.caption, styles.intro, { color: theme.muted }]} testID="recently-deleted-empty">
            {strings.recentlyDeleted.empty}
          </Text>
        ) : (
          <Text style={[styles.caption, styles.intro, { color: theme.muted }]}>{strings.recentlyDeleted.intro}</Text>
        )}
        {(deleted ?? []).map((card) => (
          <DeletedRow
            key={card.id}
            card={card}
            left={daysLeft(card.deletedAt, now)}
            busy={busy}
            onRestore={() => void restore(card)}
            onDeleteNow={() => confirmDeleteNow(card)}
          />
        ))}
        {deleted !== null && deleted.length > 0 ? (
          <Button
            variant="danger"
            label={strings.recentlyDeleted.emptyAction}
            accessibilityLabel={strings.recentlyDeleted.emptyLabel}
            onPress={confirmEmpty}
            disabled={busy}
            testID="recently-deleted-empty-all"
          />
        ) : null}
      </ScrollView>
      <ConfirmSheet
        visible={confirming !== null}
        title={confirming?.title ?? ''}
        body={confirming?.body ?? ''}
        confirmLabel={confirming?.label ?? ''}
        onConfirm={() => {
          const go = confirming?.go;
          setConfirming(null);
          go?.();
        }}
        onCancel={() => setConfirming(null)}
      />
    </Screen>
  );
}

type RowProps = { card: DeletedCard; left: number; busy: boolean; onRestore: () => void; onDeleteNow: () => void };

function DeletedRow({ card, left, busy, onRestore, onDeleteNow }: RowProps) {
  const theme = useTheme();
  const thumb = useCardImage(card, 'thumb');
  const name = displayName(card);
  return (
    <Panel style={styles.row} testID={`deleted-${card.id}`}>
      <View style={styles.main}>
        <View style={styles.thumb} accessible accessibilityLabel={`${name}, ${strings.recentlyDeleted.daysLeft(left)}`}>
          <View style={[styles.picture, { borderRadius: THUMB_W * CARD_RADIUS, backgroundColor: theme.bannerBg }]}>
            <CardPicture uri={thumb} vertical={card.vertical} radius={THUMB_W * CARD_RADIUS} blurPreview={card.blurPreview} />
          </View>
          <View style={styles.text}>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
              {name}
            </Text>
            <Text style={[styles.caption, { color: theme.muted }]}>{strings.recentlyDeleted.daysLeft(left)}</Text>
          </View>
        </View>
        {/* Restore is the row's action, beside what it brings back. Delete now can't be undone, so it is set
            apart below a rule, on the other side of the row. */}
        <View style={styles.restore}>
          <Button
            variant="secondary"
            label={strings.recentlyDeleted.restore}
            accessibilityLabel={strings.recentlyDeleted.restoreLabel(name)}
            onPress={onRestore}
            disabled={busy}
            testID={`restore-${card.id}`}
          />
        </View>
      </View>
      <View style={[styles.danger, { borderTopColor: theme.border }]}>
        <Button
          variant="danger"
          label={strings.recentlyDeleted.deleteNow}
          accessibilityLabel={strings.recentlyDeleted.deleteNowLabel(name)}
          onPress={onDeleteNow}
          disabled={busy}
          testID={`delete-now-${card.id}`}
        />
      </View>
    </Panel>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  intro: { paddingHorizontal: 4 },
  row: { gap: 12, padding: 16 },
  main: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  picture: { width: THUMB_W, height: THUMB_W / ID1_RATIO, overflow: 'hidden' },
  text: { flex: 1, gap: 4 },
  restore: { minWidth: 96 },
  danger: { alignItems: 'flex-start', paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  title: { fontSize: TYPE.body, fontWeight: '700' },
  caption: { fontSize: TYPE.secondary },
});

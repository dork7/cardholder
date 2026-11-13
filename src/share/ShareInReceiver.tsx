import { useRouter } from 'expo-router';
import { useShareIntent } from 'expo-share-intent';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useApp } from '../app/AppProvider';
import { canAddCard } from '../purchases/limits';
import { useAppLocked } from '../security/AppLockGate';
import { strings } from '../strings';
import { clearShared, copyShared, discardShared } from './sharedFiles';
import { planShared, setPendingShared, SharedFile } from './sharedIn';

// Listens for photos and PDFs shared to Doc Keeper and opens New document with them. Draws nothing.
// With the app lock up, the share waits underneath until the phone's own lock says yes.
export function ShareInReceiver() {
  const { cards, unlocked } = useApp();
  const locked = useAppLocked();
  const router = useRouter();
  // The unlock prompt sends the app to the background for a moment; the share must outlast that, so
  // it is taken into `received` here and the library's own copy cleared by hand.
  const { shareIntent, resetShareIntent, error } = useShareIntent({ resetOnBackground: false });
  const [received, setReceived] = useState<SharedFile[] | null>(null);

  useEffect(() => clearShared(), []);

  useEffect(() => {
    const files = shareIntent.files;
    if (!files || files.length === 0) return;
    setReceived(files.map((f) => ({ path: f.path, mimeType: f.mimeType ?? '', fileName: f.fileName })));
    resetShareIntent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareIntent]);

  useEffect(() => {
    if (error) console.warn('Receiving a share failed', error);
  }, [error]);

  useEffect(() => {
    if (!received || locked) return;
    setReceived(null);
    const plan = planShared(received);
    const handedOver = received.map((f) => f.path);
    if (!plan) {
      discardShared(handedOver);
      Alert.alert(strings.shareIn.tooMany);
      return;
    }
    // At the free limit the purchase screen shows instead, and what was shared is let go.
    if (!canAddCard(cards.length, unlocked)) {
      discardShared(handedOver);
      router.push('/paywall');
      return;
    }
    copyShared(received)
      .then((copies) => {
        const ours = planShared(copies);
        if (!ours) return discardShared(copies.map((c) => c.path));
        setPendingShared(ours);
        router.push('/edit/new');
      })
      .catch((e) => {
        console.warn('Opening the shared file failed', e);
        Alert.alert(strings.shareIn.failed);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [received, locked]);

  return null;
}

import { useRouter } from 'expo-router';
import { useShareIntent } from 'expo-share-intent';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useApp } from '../app/AppProvider';
import { canAddCard } from '../purchases/limits';
import { useAppLocked } from '../security/AppLockGate';
import { strings } from '../strings';
import { clearShared, copyShared, discardShared } from './sharedFiles';
import { planShared, setPendingShared, setPendingNoteText, SharedFile } from './sharedIn';

// Listens for text, photos and PDFs shared to Doc Keeper and opens a new note or document. Draws nothing.
// With the app lock up, the share waits underneath until the phone's own lock says yes.
export function ShareInReceiver() {
  const { cards, unlocked } = useApp();
  const locked = useAppLocked();
  const router = useRouter();
  // The unlock prompt sends the app to the background for a moment; the share must outlast that, so
  // it is taken into `received` here and the library's own copy cleared by hand.
  const { shareIntent, resetShareIntent, error } = useShareIntent({ resetOnBackground: false });
  const [received, setReceived] = useState<{ files: SharedFile[]; text: string | null } | null>(null);

  useEffect(() => clearShared(), []);

  useEffect(() => {
    const files = shareIntent.files;
    const text = shareIntent.text;
    if (!files?.length && text == null) return;
    setReceived({
      files: (files ?? []).map((f) => ({ path: f.path, mimeType: f.mimeType ?? '', fileName: f.fileName })),
      text: text ?? null,
    });
    resetShareIntent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareIntent]);

  useEffect(() => {
    if (!error) return;
    console.warn('Receiving a share failed', error);
    Alert.alert(strings.shareIn.failed);
  }, [error]);

  useEffect(() => {
    if (!received || locked) return;
    setReceived(null);
    // File shares can carry captions too; preserve the existing document import in that case.
    if (received.files.length === 0) {
      if (received.text?.trim()) {
        setPendingNoteText(received.text);
        router.push('/note/new');
      }
      return;
    }
    const plan = planShared(received.files);
    const handedOver = received.files.map((f) => f.path);
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
    copyShared(received.files)
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

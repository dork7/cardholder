import { usePreventRemove } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { strings } from '../strings';

// While a form has changes, leaving it (Close, the back button, swiping the sheet down) asks first
// instead of quietly throwing the changes away. Returns `leave`: call it before navigating away on
// purpose, e.g. after saving or deleting, so that doesn't ask.
export function useConfirmDiscard(changed: boolean): () => void {
  const [left, setLeft] = useState(false);
  const disablePrevention = usePreventRemove(changed && !left, ({ repeat }) =>
    Alert.alert(strings.edit.discardTitle, strings.edit.discardBody, [
      { text: strings.edit.keepEditing, style: 'cancel' },
      {
        text: strings.edit.discard,
        style: 'destructive',
        onPress: () => {
          setLeft(true);
          repeat();
        },
      },
    ]),
  );
  return () => {
    setLeft(true);
    disablePrevention();
  };
}

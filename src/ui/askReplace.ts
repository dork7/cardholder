import { Alert } from 'react-native';
import { strings } from '../strings';

// Asked when a new or received card looks like one already saved (src/cards/duplicates.ts).
export function askReplace(name: string): Promise<'replace' | 'keep' | 'cancel'> {
  return new Promise((resolve) =>
    Alert.alert(
      strings.edit.duplicateTitle(name),
      strings.edit.duplicateBody,
      [
        { text: strings.common.cancel, style: 'cancel', onPress: () => resolve('cancel') },
        { text: strings.edit.keepBoth, onPress: () => resolve('keep') },
        { text: strings.edit.replace, onPress: () => resolve('replace') },
      ],
      { cancelable: true, onDismiss: () => resolve('cancel') },
    ),
  );
}

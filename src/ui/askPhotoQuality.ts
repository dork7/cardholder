import { Alert } from 'react-native';
import { PhotoProblem } from '../images/photoQuality';
import { strings } from '../strings';

export function askPhotoQuality(problem: PhotoProblem, side: 'front' | 'back', fromCamera: boolean): Promise<'replace' | 'keep' | 'cancel'> {
  return new Promise((resolve) => Alert.alert(
    strings.edit.photoQuality.title,
    strings.edit.photoQuality.body(problem, side),
    [
      { text: fromCamera ? strings.edit.photoQuality.retake : strings.edit.photoQuality.replace, onPress: () => resolve('replace') },
      { text: strings.edit.photoQuality.keep, onPress: () => resolve('keep') },
    ],
    { cancelable: true, onDismiss: () => resolve('cancel') },
  ));
}

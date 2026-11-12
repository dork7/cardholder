import { Directory, Paths } from 'expo-file-system';

// Earlier versions let the user download language models, a few hundred MB to a few GB each, into
// the app's storage. Nothing uses them now and no screen can delete them, so they go at startup.
export function removeModelFiles(): void {
  try {
    const dir = new Directory(Paths.document, 'models');
    if (dir.exists) dir.delete();
  } catch (e) {
    console.warn('Removing old model files failed', e);
  }
}

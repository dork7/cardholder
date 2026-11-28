import { Platform } from 'react-native';
import { requireNativeModule } from 'expo';

export interface PickedContact { name: string; phone: string }

// The system picker grants only the selected contact to this app. No address-book permission is used.
export async function pickContact(): Promise<PickedContact | null> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return null;
  const picker = requireNativeModule<{ pickContact(): Promise<PickedContact | null> }>('ProfileContactPicker');
  return picker.pickContact();
}

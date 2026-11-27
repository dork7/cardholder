import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

// Play services authorisation for Drive backup (modules/google-drive-auth, ADR-0010). Only the
// drive.file scope: the files Doc Keeper creates. Absent on iOS and on phones without Play services.
export type AuthResult =
  | { status: 'ok'; accessToken: string }
  | { status: 'needs-consent' } // never granted, or the user removed access in their Google account
  | { status: 'cancelled' } // the user closed the account chooser or the consent screen
  | { status: 'unavailable' }; // no Play services, or not Android

export interface GoogleAuth {
  isAvailable(): boolean;
  isOnUnmeteredNetwork(): boolean;
  // interactive: may show the account chooser and consent screen. Silent calls never show UI.
  authorize(interactive: boolean): Promise<AuthResult>;
  clearToken(token: string): Promise<void>;
}

interface Native {
  isAvailable(): boolean;
  isOnUnmeteredNetwork(): boolean;
  authorize(interactive: boolean): Promise<{ status: string; accessToken?: string }>;
  clearToken(token: string): Promise<void>;
}

const native = Platform.OS === 'android' ? requireOptionalNativeModule<Native>('GoogleDriveAuth') : null;

export const googleAuth: GoogleAuth = {
  isAvailable: () => {
    try {
      return native?.isAvailable() ?? false;
    } catch {
      return false;
    }
  },
  isOnUnmeteredNetwork: () => native?.isOnUnmeteredNetwork() ?? false,
  async authorize(interactive) {
    if (!native) return { status: 'unavailable' };
    const result = await native.authorize(interactive);
    if (result.status === 'ok' && result.accessToken) return { status: 'ok', accessToken: result.accessToken };
    if (result.status === 'cancelled') return { status: 'cancelled' };
    return { status: 'needs-consent' };
  },
  clearToken: async (token) => { await native?.clearToken(token); },
};

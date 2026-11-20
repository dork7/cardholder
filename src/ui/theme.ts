import { useColorScheme } from 'react-native';

// Fluid glass direction from prototypes/doc-keeper/?variant=apple. Opaque values are
// text-safe fallbacks; glass is used only for raised controls and navigation.
export interface Theme {
  bg: string;
  surface: string;
  glass: string;
  glassStrong: string;
  text: string;
  muted: string;
  accent: string;
  onAccent: string;
  ornament: string;
  selection: string;
  danger: string;
  border: string;
  rosette: string;
  bannerBg: string;
  bannerText: string;
  photoDim: string;
  counterBg: string;
  blurTint: 'light' | 'dark';
  showcase: { start: string; end: string; ink: string; spaces: Record<'personal' | 'family' | 'home' | 'travel', string> };
}

const light: Theme = {
  showcase: { start: '#515BE9', end: '#303FE5', ink: '#FFFFFF', spaces: { personal: '#E9E4FA', family: '#E2EEEA', home: '#F1E7D4', travel: '#DCE3FA' } },
  counterBg: '#000000',
  bg: '#F1F3F9', surface: '#FFFFFF',
  glass: 'rgba(255, 255, 255, 0.64)', glassStrong: 'rgba(255, 255, 255, 0.82)',
  text: '#1C2433', muted: '#596273', accent: '#3442E6', onAccent: '#FFFFFF',
  ornament: '#8AA7D1', selection: '#3442E6', danger: '#B3263B',
  border: 'rgba(255, 255, 255, 0.85)', rosette: '#6E788B',
  bannerBg: '#E6EDF8', bannerText: '#1C2433', photoDim: 'transparent', blurTint: 'light',
};

const dark: Theme = {
  showcase: { start: '#484FBF', end: '#252F9D', ink: '#FFFFFF', spaces: { personal: '#383055', family: '#213F3B', home: '#403729', travel: '#263B61' } },
  counterBg: '#000000',
  bg: '#101827', surface: '#19253A',
  glass: 'rgba(35, 49, 73, 0.66)', glassStrong: 'rgba(35, 49, 73, 0.84)',
  text: '#F3F6FC', muted: '#B5C1D3', accent: '#A7B3FF', onAccent: '#10243E',
  ornament: '#8AA7D1', selection: '#A7B3FF', danger: '#FF8B9B',
  border: 'rgba(255, 255, 255, 0.18)', rosette: '#A5B3C8',
  bannerBg: '#26344B', bannerText: '#F3F6FC', photoDim: 'rgba(0, 0, 0, 0.12)', blurTint: 'dark',
};

export const TYPE = { caption: 12, secondary: 14, body: 16, section: 18, title: 31, display: 32 } as const;
export const TRACKING = { tight: -0.7, caps: 0.5 } as const;
// control is the prototype's primary-button radius (17); sm stays for chips and small tiles.
export const RADIUS = { none: 0, sm: 14, control: 17, md: 20, lg: 28 } as const;
export const SHADOW = {
  // Document panels: a barely-there lift, as the prototype's `0 4px 15px #31457009`.
  soft: { shadowColor: '#314570', shadowOpacity: 0.035, shadowRadius: 15, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  medium: { shadowColor: '#314570', shadowOpacity: 0.09, shadowRadius: 16, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  heavy: { shadowColor: '#314570', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 9 }, elevation: 7 },
} as const;

export const palettes = { light, dark } as const;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

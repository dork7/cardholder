import { useColorScheme } from 'react-native';

// Spotify-inspired (.claude/skills/spotify-design): near-black surfaces where the card photos are
// the only colour, one functional amber (our own, not Spotify's green) for primary actions and active states, announcement blue
// reserved for selection, and negative red for anything destructive.
export interface Theme {
  bg: string; // the page
  surface: string; // one step up: panels, card tiles
  text: string;
  muted: string; // secondary text (passes 4.5:1 on bg)
  accent: string; // filled primary buttons, active chips, links
  onAccent: string;
  selection: string; // selection, focus, the card being dragged — nothing else
  danger: string;
  border: string; // hairlines between list items
  rosette: string; // outlines of secondary buttons, field underlines (3:1)
  bannerBg: string; // two steps up: banners, sheets, chips
  bannerText: string;
  photoDim: string; // veil over card thumbnails so white plastic doesn't glare in the dark; never on the counter view
}

// The style is dark-first; light keeps the same geometry. The dark amber doesn't reach 3:1 on white,
// so light mode uses a deeper amber with white labels.
const light: Theme = {
  bg: '#FFFFFF',
  surface: '#F4F4F4',
  text: '#121212',
  muted: '#5E5E5E',
  accent: '#8A5A00',
  onAccent: '#FFFFFF',
  selection: '#1F6FD0',
  danger: '#C2283A',
  border: 'rgba(0, 0, 0, 0.1)',
  rosette: '#7C7C7C',
  bannerBg: '#EEEEEE',
  bannerText: '#121212',
  photoDim: 'transparent',
};

// Depth through shade: #121212 page, #181818 surfaces, #1f1f1f for what sits on them.
const dark: Theme = {
  bg: '#121212',
  surface: '#181818',
  text: '#FDFDFD',
  muted: '#B3B3B3',
  accent: '#F5B83D',
  onAccent: '#000000',
  selection: '#539DF5',
  danger: '#F3727F',
  border: 'rgba(255, 255, 255, 0.1)',
  rosette: '#7C7C7C',
  bannerBg: '#1F1F1F',
  bannerText: '#FDFDFD',
  photoDim: 'rgba(0, 0, 0, 0.12)',
};

// Compact, as the style asks: 12–24 for the UI, with display kept for the counter view.
export const TYPE = { caption: 12, secondary: 14, body: 16, section: 18, title: 24, display: 32 } as const;

// Heavy enough to read on near-black: medium lifts cards, heavy floats dialogs and the add button.
export const SHADOW = {
  medium: { shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  heavy: { shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
} as const;

// Exported for the contrast tests.
export const palettes = { light, dark } as const;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

import { useColorScheme } from 'react-native';

// Security-printing palette: cool security paper, intaglio ink, guilloche lines,
// a hologram violet reserved for selection, and rubber-stamp red for anything destructive.
export interface Theme {
  bg: string; // security paper
  surface: string; // slightly lifted paper (modals, banners)
  text: string; // intaglio ink
  muted: string; // secondary text (passes 4.5:1 on bg)
  accent: string; // filled primary buttons and links
  onAccent: string;
  selection: string; // hologram violet: selection, focus, the card being dragged — nothing else
  danger: string; // stamp red
  border: string; // hairlines between list items
  rosette: string; // guilloche line colour, field underlines
  bannerBg: string;
  bannerText: string;
  photoDim: string; // veil over card thumbnails so white plastic doesn't glare in the dark; never on the counter view
}

const light: Theme = {
  bg: '#EDF1EC',
  surface: '#F6F8F5',
  text: '#1D3B4A',
  muted: '#4F6A66',
  accent: '#1D3B4A',
  onAccent: '#EDF1EC',
  selection: '#5B44C8',
  danger: '#B3261E',
  border: '#C9D4CF',
  rosette: '#7C9893',
  bannerBg: '#E1E8E3',
  bannerText: '#1D3B4A',
  photoDim: 'transparent',
};

// Not an inversion: neutral near-black paper with elevation shown by lighter greys (never shadows),
// off-white rather than pure-white ink, saturated hues are pulled back ~25% so they don't vibrate on the dark paper,
// the filled accent is a dimmer ink so a full-width button isn't a glaring slab, and hairlines
// are translucent ink so they read the same on paper and on lifted surfaces.
const dark: Theme = {
  bg: '#121212', // darkest: the page
  surface: '#1E1E1E', // surface 1: header, card tiles, chips
  text: '#E0E0E0',
  muted: '#A3A3A3',
  accent: '#C8C8C8',
  onAccent: '#121212',
  selection: '#ADA3EE',
  danger: '#F0988F',
  border: 'rgba(255, 255, 255, 0.12)',
  rosette: '#707070', // 3:1 on bg and surface, so field underlines still mark the field
  bannerBg: '#242424', // surface 2: banners, sheets
  bannerText: '#E0E0E0',
  photoDim: 'rgba(0, 0, 0, 0.12)',
};

// Bringhurst-style scale, body one step above the platform default for arm's-length reading.
export const TYPE = { caption: 14, secondary: 16, body: 18, section: 21, title: 24, display: 36 } as const;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

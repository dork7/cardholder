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
};

const dark: Theme = {
  bg: '#101B22',
  surface: '#172630',
  text: '#E3EAE6',
  muted: '#9DB2AE',
  accent: '#E3EAE6',
  onAccent: '#101B22',
  selection: '#A99BFF',
  danger: '#FF8A80',
  border: '#2A3D47',
  rosette: '#4A6670',
  bannerBg: '#1B2C36',
  bannerText: '#E3EAE6',
};

// Bringhurst-style scale, body one step above the platform default for arm's-length reading.
export const TYPE = { caption: 14, secondary: 16, body: 18, section: 21, title: 24, display: 36 } as const;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

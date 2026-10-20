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
  // Stacked Journal Tokens
  card: string;
  cardBack: string;
  accentInk: string;
  onButton: string;
  // Home screen glass: soft colour blobs behind frosted panels.
  aurora: [string, string, string]; // backdrop blobs, drawn as radial gradients over `bg`
  glassFill: string; // translucent panel fill over the blur (heavier where the platform can't blur)
  glassFillNoBlur: string;
  glassEdge: string; // rim, brighter than the fill so the edge catches light
  glassEdgeLit: string; // top rim, where the light falls
  glassShade: string; // inset bottom shade and ambient drop shadow
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
  card: '#F6F8F5',
  cardBack: '#E1E8E3',
  accentInk: '#EDF1EC',
  onButton: '#EDF1EC',
  aurora: ['#B2A8EB', '#86C0B1', '#93B5D4'],
  glassFill: 'rgba(246, 248, 245, 0.62)', // muted text keeps 4.5:1 over the strongest blob
  glassFillNoBlur: 'rgba(246, 248, 245, 0.86)',
  glassEdge: 'rgba(255, 255, 255, 0.45)',
  glassEdgeLit: 'rgba(255, 255, 255, 0.9)',
  glassShade: 'rgba(29, 59, 74, 0.18)',
};

const dark: Theme = {
  bg: '#001219',
  surface: '#233d4d',
  text: '#f1f5f7',
  muted: '#9fb3bf',
  accent: '#fe7f2d',
  onAccent: '#001219',
  selection: '#fe7f2d',
  danger: '#FF8A80',
  border: '#fe7f2d',
  rosette: '#4A6670',
  bannerBg: '#1B2C36',
  bannerText: '#E3EAE6',
  card: '#233d4d',
  cardBack: '#1c3443',
  accentInk: '#001219',
  onButton: '#ffffff',
  aurora: ['#4A3BA8', '#1F6E60', '#24557A'],
  glassFill: 'rgba(23, 38, 48, 0.45)',
  glassFillNoBlur: 'rgba(23, 38, 48, 0.86)',
  glassEdge: 'rgba(227, 234, 230, 0.14)',
  glassEdgeLit: 'rgba(227, 234, 230, 0.32)',
  glassShade: 'rgba(0, 0, 0, 0.35)',
};

// Bringhurst-style scale, body one step above the platform default for arm's-length reading.
export const TYPE = { caption: 14, secondary: 16, body: 18, section: 21, title: 24, display: 36 } as const;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

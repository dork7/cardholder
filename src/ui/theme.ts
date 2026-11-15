import { useColorScheme } from 'react-native';

// Swiss style (.claude/skills/swiss-design): white paper and off-black ink, square corners,
// hairline rules and a strict type scale. The card photos are the only strong colour. The filled
// accent is ink itself (charcoal on light, warm paper on dark); taupe is the one decorative tint,
// used only inside icons and the logo. Selection blue and negative red stay functional.
export interface Theme {
  bg: string; // the page
  surface: string; // one step up: panels, card tiles
  text: string;
  muted: string; // secondary text (passes 4.5:1 on bg)
  accent: string; // filled primary buttons, active chips, the add button
  onAccent: string;
  ornament: string; // the icons' and logo's tint: decoration only, never an action or a state
  selection: string; // selection, focus, the card being dragged — nothing else
  danger: string;
  border: string; // hairlines between list items and round panels
  rosette: string; // outlines of secondary buttons, field underlines (3:1)
  bannerBg: string; // two steps up: banners, sheets, chips
  bannerText: string;
  photoDim: string; // veil over card thumbnails so white plastic doesn't glare in the dark; never on the counter view
}

// Light is the classic Swiss sheet: white page, off-black ink (never pure #000), beige for raised
// layers. The grey outline is the style's own #808080, which reaches 3:1 on white.
const light: Theme = {
  bg: '#FFFFFF',
  surface: '#F7F6F3',
  text: '#111111',
  muted: '#5C5C5C',
  accent: '#111111',
  onAccent: '#FFFFFF',
  ornament: '#B38B6D',
  selection: '#1F6FD0',
  danger: '#C2283A',
  border: 'rgba(0, 0, 0, 0.12)',
  rosette: '#808080',
  bannerBg: '#F5F1E8',
  bannerText: '#111111',
  photoDim: 'transparent',
};

// Dark inverts it: charcoal page, off-white ink, and the beige paper becomes the filled accent.
// Depth through shade: #111111 page, #1A1A1A surfaces, #242424 for what sits on them.
const dark: Theme = {
  bg: '#111111',
  surface: '#1A1A1A',
  text: '#F5F5F5',
  muted: '#A8A8A8',
  accent: '#F5F1E8',
  onAccent: '#111111',
  ornament: '#B38B6D',
  selection: '#539DF5',
  danger: '#F3727F',
  border: 'rgba(255, 255, 255, 0.12)',
  rosette: '#808080',
  bannerBg: '#242424',
  bannerText: '#F5F5F5',
  photoDim: 'rgba(0, 0, 0, 0.12)',
};

// A strict scale on an 8 pt rhythm: 12–24 for the UI, display kept for the counter view.
export const TYPE = { caption: 12, secondary: 14, body: 16, section: 18, title: 24, display: 32 } as const;

// Headings are set tight; small uppercase labels are tracked open.
export const TRACKING = { tight: -0.4, caps: 1.2 } as const;

// Square by default. Controls take a 2 pt corner so they read as pressable, not as rules;
// panels, sheets and bars stay sharp. Card photos keep the real card's corner (stackGeometry).
export const RADIUS = { none: 0, sm: 2, md: 4 } as const;

// Sharp and light: a crisp edge rather than a glow. Medium for tiles, heavy for what floats
// (dialogs, the add button).
export const SHADOW = {
  medium: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  heavy: { shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
} as const;

// Exported for the contrast tests.
export const palettes = { light, dark } as const;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

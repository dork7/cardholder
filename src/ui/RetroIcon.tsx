import Svg, { Path } from 'react-native-svg';
import { useTheme } from './theme';

export type RetroIconName = 'backup' | 'documents' | 'lock' | 'appearance' | 'blur' | 'expiry' | 'import' | 'settings';
type Tone = 'outline' | 'amber' | 'paper';
type Layer = { tone: Tone; d: string };

// The approved retro concepts, drawn on a 24-pixel grid so they stay sharp at any size.
const ICONS: Record<RetroIconName, Layer[]> = {
  backup: [
    { tone: 'outline', d: 'M3 2h16v2h2v18H2V3h1z' },
    { tone: 'amber', d: 'M4 4h14v2h1v14H4z' },
    { tone: 'outline', d: 'M6 2h11v9H6zM5 13h13v9H5z' },
    { tone: 'paper', d: 'M8 4h7v5H8zM7 15h9v5H7z' },
    { tone: 'outline', d: 'M12 4h2v4h-2zM8 16h7v1H8zM8 18h7v1H8z' },
  ],
  documents: [
    { tone: 'outline', d: 'M3 2h18v19h-2v1h-2v-1H7v1H5v-1H3z' },
    { tone: 'amber', d: 'M5 4h14v15H5z' },
    { tone: 'outline', d: 'M6 5h12v6H6zM6 12h12v6H6z' },
    { tone: 'amber', d: 'M7 6h10v4H7zM7 13h10v4H7z' },
    { tone: 'outline', d: 'M9 7h6v2H9zM9 14h6v2H9z' },
    { tone: 'paper', d: 'M10 7h4v1h-4zM10 14h4v1h-4z' },
  ],
  lock: [
    { tone: 'outline', d: 'M8 2h8v2h2v2h1v5h2v11H3V11h2V6h1V4h2z' },
    { tone: 'amber', d: 'M8 5h2V4h4v1h2v6h-2V7h-1V6h-2v1h-1v4H8zM5 13h14v7H5z' },
    { tone: 'paper', d: 'M10 8h1V7h2v1h1v3h-4z' },
    { tone: 'outline', d: 'M11 14h2v1h1v3h-1v2h-2v-2h-1v-3h1z' },
    { tone: 'paper', d: 'M11 15h2v2h-1v2h-1z' },
  ],
  appearance: [
    { tone: 'outline', d: 'M2 2h20v16h-8v2h4v2H6v-2h4v-2H2z' },
    { tone: 'amber', d: 'M4 4h16v12H4zM11 18h2v3h-2zM8 21h8v1H8z' },
    { tone: 'outline', d: 'M5 5h14v9H5z' },
    { tone: 'paper', d: 'M7 6h10v1h1v5h-1v1H7v-1H6V7h1zM18 15h1v1h-1z' },
  ],
  blur: [
    { tone: 'outline', d: 'M9 5h6v1h3v2h2v2h2v4h-2v2h-2v2h-3v1H9v-1H6v-2H4v-2H2v-4h2V8h2V6h3z' },
    { tone: 'amber', d: 'M9 7h6v1h3v2h2v4h-2v2h-3v1H9v-1H6v-2H4v-4h2V8h3z' },
    { tone: 'paper', d: 'M9 8h6v1h2v6h-2v1H9v-1H7V9h2z' },
    { tone: 'outline', d: 'M11 9h3v5h-3v1H9v-4h2zM19 2h3v3h-3v3h-3v3h-3v3h-3v3H7v3H4v2H1v-3h3v-3h3v-3h3v-3h3V7h3V4h3z' },
  ],
  expiry: [
    { tone: 'outline', d: 'M4 2h16v4h-2v3h-2v2h-2v2h2v2h2v3h2v4H4v-4h2v-3h2v-2h2v-2H8V9H6V6H4z' },
    { tone: 'amber', d: 'M6 3h12v2H6zM6 19h12v2H6z' },
    { tone: 'paper', d: 'M8 6h8v3h-2v2h-1v2h1v2h2v3H8v-3h2v-2h1v-2h-1V9H8z' },
    { tone: 'amber', d: 'M9 8h6v1h-1v1h-1v2h-2v-2h-1V9H9zM11 14h2v2h1v1h1v1H9v-1h1v-1h1z' },
  ],
  import: [
    { tone: 'outline', d: 'M9 2h6v8h4v4h-2v2h-2v2H9v-2H7v-2H5v-4h4zM2 16h5v4h10v-4h5v7H2z' },
    { tone: 'amber', d: 'M11 4h2v8h4v1h-2v2h-2v1h-2v-1H9v-2H7v-1h4zM4 18h1v4h14v-4h1v4H4z' },
  ],
  settings: [
    { tone: 'outline', d: 'M9 1h6v3h2V3h3v3h-1v3h4v6h-4v2h1v3h-3v-1h-2v4H9v-4H7v1H4v-3h1v-2H1V9h4V7H4V4h3v1h2z' },
    { tone: 'amber', d: 'M11 3h2v3h4V5h1v1h-1v5h4v2h-4v4h1v1h-1v-1h-4v4h-2v-4H7v1H6v-1h1v-4H3v-2h4V7H6V6h1v1h4z' },
    { tone: 'outline', d: 'M10 8h4v2h2v4h-2v2h-4v-2H8v-4h2z' },
    { tone: 'paper', d: 'M11 10h2v1h1v2h-1v1h-2v-1h-1v-2h1z' },
  ],
};

export function RetroIcon({ name, size = 24, color, backgroundColor, appearance }: {
  name: RetroIconName;
  size?: number;
  color?: string; // monochrome for filled action buttons
  backgroundColor?: string;
  appearance?: 'system' | 'light' | 'dark';
}) {
  const theme = useTheme();
  const fills: Record<Tone, string> = {
    outline: color ?? theme.text,
    amber: color ?? theme.accent,
    paper: backgroundColor ?? theme.bg,
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false} importantForAccessibility="no-hide-descendants">
      {ICONS[name].map((layer, i) => <Path key={i} d={layer.d} fill={fills[layer.tone]} />)}
      {name === 'appearance' && appearance && (
        <Path
          fill={fills.outline}
          d={appearance === 'light' ? 'M11 7h2v1h1v3h-1v1h-2v-1h-1V8h1z' : appearance === 'dark' ? 'M10 7h2v3h3v1h-1v1h-4v-1H9V8h1z' : 'M9 8h3v4H9z'}
        />
      )}
    </Svg>
  );
}

import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useTheme } from './theme';

// Kept under the existing component name so every screen uses one icon vocabulary.
// The paths match the rounded, 1.7 pt outline icons in the fluid glass prototype.
export type RetroIconName =
  | 'backup' | 'documents' | 'lock' | 'appearance' | 'blur' | 'expiry' | 'import' | 'settings'
  | 'plus' | 'note' | 'gallery' | 'folder' | 'search' | 'home' | 'spaces' | 'arrow' | 'back';
export type ActionIconName =
  | 'trash' | 'share' | 'edit' | 'pin' | 'unpin' | 'present' | 'tag' | 'pdf' | 'refresh' | 'more';
type IconName = RetroIconName | ActionIconName;

export const ICON_PATHS: Record<Exclude<IconName, 'appearance' | 'documents' | 'gallery' | 'more'>, string> = {
  backup: 'M7 17H5a4 4 0 0 1 0-8 7 7 0 0 1 14 0 4 4 0 0 1 0 8h-2M12 21V11m-4 4 4-4 4 4',
  lock: 'M8 10V7a4 4 0 0 1 8 0v3M12 14v3',
  blur: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12',
  expiry: 'M12 7v5l3 2',
  import: 'M12 3v13m-4-4 4 4 4-4M4 17v4h16v-4',
  settings: 'm9 3-1 3-3 1-2 4 2 2 1 4 4 3 3-1 4-1 3-4-1-3-1-4-4-2z',
  home: 'm3 10 9-7 9 7v10H3zM9 20v-7h6v7',
  spaces: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM8 12h.01M12 12h.01M16 12h.01',
  arrow: 'M4 12h16m-7-7 7 7-7 7',
  back: 'M20 12H4m7-7-7 7 7 7',
  plus: 'M12 5v14M5 12h14',
  note: 'M14 3H5v18h14V8zM14 3v6h5M8 13h8M8 17h5',
  folder: 'M3 6h7l2 2h9v12H3z',
  search: 'M15 15l5 5',
  trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',
  share: 'M12 16V3m-4 4 4-4 4 4M5 12v9h14v-9',
  edit: 'M4 20l4-.8L20 7.2 16.8 4 4.8 16zM14.8 6l3.2 3.2',
  pin: 'M8 3h8l-1 6 4 4H5l4-4zM12 13v8',
  unpin: 'M8 3h8l-1 6 4 4H5l4-4zM12 13v8M3 21 21 3',
  present: 'M3 4h18v13H3zM9 21h6M12 17v4',
  tag: 'M3 3h8l10 10-8 8L3 11z',
  pdf: 'M14 3H5v18h14V8zM14 3v6h5M8 13h8M8 17h5',
  refresh: 'M20 7v5h-5M4 17v-5h5M5.5 9A7 7 0 0 1 18 6l2 1M4 17l2 1a7 7 0 0 0 12.5-3',
};

export function RetroIcon({ name, size = 24, color, appearance }: {
  name: IconName;
  size?: number;
  color?: string;
  appearance?: 'system' | 'light' | 'dark';
}) {
  const theme = useTheme();
  const stroke = color ?? theme.text;
  const grid = name === 'documents' || name === 'gallery';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.7}
      strokeLinecap="round" strokeLinejoin="round" accessible={false} importantForAccessibility="no-hide-descendants">
      {grid ? (
        <>
          <Rect x={3} y={3} width={7} height={7} rx={1} />
          <Rect x={14} y={3} width={7} height={7} rx={1} />
          <Rect x={3} y={14} width={7} height={7} rx={1} />
          <Rect x={14} y={14} width={7} height={7} rx={1} />
        </>
      ) : name === 'more' ? (
        // Three dots in a row: more actions.
        <>
          <Circle cx={5} cy={12} r={1.2} fill={stroke} />
          <Circle cx={12} cy={12} r={1.2} fill={stroke} />
          <Circle cx={19} cy={12} r={1.2} fill={stroke} />
        </>
      ) : name === 'appearance' ? (
        <>
          {appearance === 'light' ? (
            <><Circle cx={12} cy={12} r={4} /><Path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>
          ) : appearance === 'dark' ? (
            <Path d="M20.5 14.3A8.6 8.6 0 0 1 9.7 3.5 8.7 8.7 0 1 0 20.5 14.3z" />
          ) : (
            <><Circle cx={12} cy={12} r={9} /><Path d="M12 3a9 9 0 0 1 0 18z" fill={theme.ornament} stroke="none" /></>
          )}
        </>
      ) : (
        <>
          {name === 'lock' && <Rect x={5} y={10} width={14} height={11} rx={2} />}
          {(name === 'expiry' || name === 'search') && <Circle cx={name === 'search' ? 10 : 12} cy={name === 'search' ? 10 : 12} r={name === 'search' ? 6 : 9} />}
          {(name === 'settings' || name === 'blur') && <Circle cx={12} cy={12} r={3} />}
          {name === 'tag' && <Circle cx={7} cy={7} r={1} />}
          <Path d={ICON_PATHS[name]} />
        </>
      )}
    </Svg>
  );
}

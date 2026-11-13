import Svg, { Path } from 'react-native-svg';
import { useTheme } from './theme';

// Section, field and button icons: two tones plus paper.
export type RetroIconName = 'backup' | 'documents' | 'lock' | 'appearance' | 'blur' | 'expiry' | 'import' | 'settings';
// Action icons for IconButton: one colour, drawn with outline cells only.
export type ActionIconName = 'trash' | 'share' | 'edit' | 'pin' | 'unpin' | 'present' | 'tag' | 'pdf' | 'refresh';
type Name = RetroIconName | ActionIconName | 'appearance-light' | 'appearance-dark';
type Tone = 'outline' | 'amber' | 'paper';

// Every icon is a 12 x 12 grid of cells, each 2 px in the 24 px box, so the pixels stay whole at
// every screen density. o = outline (text colour), a = amber accent, p = paper (the background
// showing through, drawn so it stays visible on a filled button), . = nothing. Same letters as
// the logo in PixelLogo.tsx.
export const ICON_GRIDS: Record<Name, string[]> = {
  // A filing cabinet: two drawers with handles.
  documents: [
    '.oooooooooo.',
    '.oaaaaaaaao.',
    '.oaooooooao.',
    '.oaoppppoao.',
    '.oaopoopoao.',
    '.oaooooooao.',
    '.oaaaaaaaao.',
    '.oaooooooao.',
    '.oaoppppoao.',
    '.oaopoopoao.',
    '.oaooooooao.',
    '.oooooooooo.',
  ],
  // A cog with a hole in the middle.
  settings: [
    '....oooo....',
    '....oaao....',
    '.oooaaaaooo.',
    '.oaaaaaaaao.',
    '.oaaaooaaao.',
    'ooaaoppoaaoo',
    'ooaaoppoaaoo',
    '.oaaaooaaao.',
    '.oaaaaaaaao.',
    '.oooaaaaooo.',
    '....oaao....',
    '....oooo....',
  ],
  // A floppy disk: shutter at the top, label at the bottom.
  backup: [
    '.oooooooooo.',
    '.oaoppppoao.',
    '.oaopoopoao.',
    '.oaoppppoao.',
    '.oaooooooao.',
    '.oaaaaaaaao.',
    '.oaaaaaaaao.',
    '.oaoooooaao.',
    '.oaoppppoao.',
    '.oaoppppoao.',
    '.oaoooooaao.',
    '.oooooooooo.',
  ],
  // A padlock, closed.
  lock: [
    '............',
    '...oooooo...',
    '...oaooao...',
    '...oa..ao...',
    '...oa..ao...',
    '.oooooooooo.',
    '.oaaaaaaaao.',
    '.oaaaooaaao.',
    '.oaaaooaaao.',
    '.oaaaooaaao.',
    '.oaaaaaaaao.',
    '.oooooooooo.',
  ],
  // Appearance: a disc that is half amber, half paper (follow the system).
  appearance: [
    '....oooo....',
    '..ooaappoo..',
    '.oaaaappppo.',
    '.oaaaappppo.',
    'oaaaaapppppo',
    'oaaaaapppppo',
    'oaaaaapppppo',
    'oaaaaapppppo',
    '.oaaaappppo.',
    '.oaaaappppo.',
    '..ooaappoo..',
    '....oooo....',
  ],
  // Light: the whole disc lit.
  'appearance-light': [
    '....oooo....',
    '..ooaaaaoo..',
    '.oaaaaaaaao.',
    '.oaaaaaaaao.',
    'oaaaaaaaaaao',
    'oaaaaaaaaaao',
    'oaaaaaaaaaao',
    'oaaaaaaaaaao',
    '.oaaaaaaaao.',
    '.oaaaaaaaao.',
    '..ooaaaaoo..',
    '....oooo....',
  ],
  // Dark: a crescent.
  'appearance-dark': [
    '....oooo....',
    '..ooaaapoo..',
    '.oaaaapppao.',
    '.oaaapppppo.',
    'oaaaappppppo',
    'oaaaappppppo',
    'oaaaappppppo',
    'oaaaappppppo',
    '.oaaapppppo.',
    '.oaaaapppao.',
    '..ooaaapoo..',
    '....oooo....',
  ],
  // An eye: the previews can be blurred.
  blur: [
    '............',
    '............',
    '....oooo....',
    '..ooaaaaoo..',
    '.oaaaooaaao.',
    'oaaaoppoaaao',
    'oaaaoppoaaao',
    '.oaaaooaaao.',
    '..ooaaaaoo..',
    '....oooo....',
    '............',
    '............',
  ],
  // An hourglass, sand running out.
  expiry: [
    '.oooooooooo.',
    '.oaaaaaaaao.',
    '..oaaaaaao..',
    '..oaaaaaao..',
    '...oaaaao...',
    '....oaao....',
    '....oppo....',
    '...oppppo...',
    '..oppppppo..',
    '..oppaappo..',
    '.oppaaaappo.',
    '.oooooooooo.',
  ],
  // An arrow dropping into a tray.
  import: [
    '.....oo.....',
    '.....oo.....',
    '.....oo.....',
    '..oooooooo..',
    '...oooooo...',
    '....oooo....',
    '.....oo.....',
    'oo........oo',
    'oo........oo',
    'ooaaaaaaaaoo',
    'ooaaaaaaaaoo',
    'oooooooooooo',
  ],
  // A bin with a lid.
  trash: [
    '....oooo....',
    '.oooooooooo.',
    '.oooooooooo.',
    '..oooooooo..',
    '..oopoopoo..',
    '..oopoopoo..',
    '..oopoopoo..',
    '..oopoopoo..',
    '..oopoopoo..',
    '..oooooooo..',
    '...oooooo...',
    '............',
  ],
  // An arrow leaving a box.
  share: [
    '.....oo.....',
    '....oooo....',
    '...oooooo...',
    '..oooooooo..',
    '.....oo.....',
    '.....oo.....',
    'oo...oo...oo',
    'oo...oo...oo',
    'oo........oo',
    'oo........oo',
    'oooooooooooo',
    'oooooooooooo',
  ],
  // A pencil, tip at the bottom left.
  edit: [
    '.........oo.',
    '........oooo',
    '.......oooo.',
    '......oooo..',
    '.....oooo...',
    '....oooo....',
    '...oooo.....',
    '..oooo......',
    '.oooo.......',
    '.ooo........',
    '.oo.........',
    '............',
  ],
  // A push pin.
  pin: [
    '...oooooo...',
    '...oooooo...',
    '...oooooo...',
    '....oooo....',
    '....oooo....',
    '.oooooooooo.',
    '.oooooooooo.',
    '.....oo.....',
    '.....oo.....',
    '.....oo.....',
    '.....oo.....',
    '............',
  ],
  // The pin with a line through it.
  unpin: [
    '...oooooo.oo',
    '...ooooopoo.',
    '...oooopoo..',
    '....oopoo...',
    '....opoo....',
    '.ooopoopooo.',
    '.oopoopoooo.',
    '...oopo.....',
    '..oo.oo.....',
    '.oo..oo.....',
    'oo...oo.....',
    '............',
  ],
  // A card up on a screen.
  present: [
    'oooooooooooo',
    'oppppppppppo',
    'oppooooooppo',
    'oppoppppoppo',
    'oppoppppoppo',
    'oppooooooppo',
    'oppppppppppo',
    'oooooooooooo',
    '.....oo.....',
    '.....oo.....',
    '....oooo....',
    '..oooooooo..',
  ],
  // A page with a down arrow: save as PDF.
  pdf: [
    '.oooooooooo.',
    '.oppppppppo.',
    '.opppoopppo.',
    '.opppoopppo.',
    '.opppoopppo.',
    '.opoooooopo.',
    '.oppooooppo.',
    '.opppoopppo.',
    '.oppppppppo.',
    '.oppppppppo.',
    '.oooooooooo.',
    '............',
  ],
  // A circular arrow.
  refresh: [
    '....oooo....',
    '..ooo..ooo..',
    '.oo......oo.',
    '.o......oooo',
    'oo......oooo',
    'oo.......ooo',
    'oo........oo',
    'oo..........',
    '.o..........',
    '.oo......oo.',
    '..ooo..ooo..',
    '....oooo....',
  ],
  // A luggage tag with its hole.
  tag: [
    '......oooooo',
    '.....oo....o',
    '....oo..oo.o',
    '...oo...oo.o',
    '..oo.......o',
    '.oo.......oo',
    'oo.......oo.',
    'oo......oo..',
    '.oo....oo...',
    '..oo..oo....',
    '...oooo.....',
    '....oo......',
  ],
};

const CELL = 2;
const TONES: Record<string, Tone> = { o: 'outline', a: 'amber', p: 'paper' };

// One path per tone: a 2 x 2 square for each cell of that letter.
function layers(grid: string[]): Partial<Record<Tone, string>> {
  const out: Partial<Record<Tone, string>> = {};
  grid.forEach((row, y) =>
    [...row].forEach((letter, x) => {
      const tone = TONES[letter];
      if (tone) out[tone] = (out[tone] ?? '') + `M${x * CELL} ${y * CELL}h${CELL}v${CELL}h-${CELL}z`;
    }),
  );
  return out;
}

const PATHS = Object.fromEntries(Object.entries(ICON_GRIDS).map(([name, grid]) => [name, layers(grid)])) as Record<
  Name,
  Partial<Record<Tone, string>>
>;

export function RetroIcon({ name, size = 24, color, backgroundColor, appearance }: {
  name: RetroIconName | ActionIconName;
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
  const key: Name = name === 'appearance' && appearance && appearance !== 'system' ? `appearance-${appearance}` : name;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false} importantForAccessibility="no-hide-descendants">
      {(Object.entries(PATHS[key]) as [Tone, string][]).map(([tone, d]) => (
        <Path key={tone} d={d} fill={fills[tone]} />
      ))}
    </Svg>
  );
}

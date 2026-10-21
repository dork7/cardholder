import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { Button } from '../Button';

let mockScheme: 'light' | 'dark' = 'light';
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: () => mockScheme,
}));

// Security paper from docs/design.md; the button sits on it.
const PAPER = { light: '#EDF1EC', dark: '#121212' } as const;

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

test('the test harness really switches themes', async () => {
  mockScheme = 'dark';
  await render(<Button label="Go" onPress={() => {}} />);
  expect(StyleSheet.flatten(screen.getByRole('button', { name: 'Go' }).props.style).backgroundColor).toBe('#A4C0CC');
});

describe.each(['light', 'dark'] as const)('%s theme', (scheme) => {
  test.each(['secondary', 'danger'] as const)('%s button boundary meets 3:1 non-text contrast', async (variant) => {
    mockScheme = scheme;
    await render(<Button label="Go" variant={variant} onPress={() => {}} />);
    const style = StyleSheet.flatten(screen.getByRole('button', { name: 'Go' }).props.style);
    expect(style.borderWidth).toBe(1);
    expect(contrast(style.borderColor as string, PAPER[scheme])).toBeGreaterThanOrEqual(3);
  });
});

import { render, screen } from '@testing-library/react-native';
import { ICON_GRIDS, RetroIcon } from '../RetroIcon';

test('every icon is a 12 x 12 grid of outline, amber, paper or empty cells', () => {
  for (const [name, grid] of Object.entries(ICON_GRIDS)) {
    expect({ name, rows: grid.length }).toEqual({ name, rows: 12 });
    for (const row of grid) expect({ name, row }).toEqual({ name, row: expect.stringMatching(/^[.oap]{12}$/) });
  }
});

test('action icons use one colour only, so a filled button can recolour them', () => {
  for (const name of ['trash', 'share', 'edit', 'pin', 'unpin', 'present', 'tag', 'pdf', 'refresh'] as const) {
    expect({ name, amber: ICON_GRIDS[name].some((row) => row.includes('a')) }).toEqual({ name, amber: false });
  }
});

test('the appearance icon has a distinct disc for system, light and dark', async () => {
  const discs = [ICON_GRIDS.appearance, ICON_GRIDS['appearance-light'], ICON_GRIDS['appearance-dark']].map((g) => g.join('\n'));
  expect(new Set(discs).size).toBe(3);
  await render(<RetroIcon name="appearance" appearance="dark" size={28} />);
  expect(screen.toJSON()).toBeTruthy();
});

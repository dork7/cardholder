import { render, screen } from '@testing-library/react-native';
import { ICON_PATHS, RetroIcon } from '../RetroIcon';

test('every outline glyph has a nonempty vector path', () => {
  for (const [name, path] of Object.entries(ICON_PATHS)) {
    expect({ name, path }).toEqual({ name, path: expect.stringMatching(/[Mm]/) });
  }
});

test('the appearance icon changes for system, light and dark', async () => {
  const drawings: string[] = [];
  for (const appearance of ['system', 'light', 'dark'] as const) {
    const view = await render(<RetroIcon name="appearance" appearance={appearance} size={28} />);
    drawings.push(JSON.stringify(screen.toJSON()));
    view.unmount();
  }
  expect(new Set(drawings).size).toBe(3);
});

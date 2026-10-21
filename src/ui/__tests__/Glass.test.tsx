import { act, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, StyleSheet } from 'react-native';
import { GlassPanel, GlassScene } from '../Glass';
import { Text } from '../Text';

function panelBackground() {
  return StyleSheet.flatten(screen.getByTestId('panel').props.style).backgroundColor;
}

async function renderPanel() {
  await render(
    <GlassScene>
      <GlassPanel testID="panel">
        <Text>Inside</Text>
      </GlassPanel>
    </GlassScene>,
  );
  await act(async () => {});
}

afterEach(() => jest.restoreAllMocks());

test('a panel is translucent glass by default', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceTransparencyEnabled').mockResolvedValue(false);
  await renderPanel();
  expect(panelBackground()).toBeUndefined();
  expect(screen.getByText('Inside')).toBeTruthy();
});

test('Reduce Transparency turns a panel into a solid surface', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceTransparencyEnabled').mockResolvedValue(true);
  await renderPanel();
  expect(panelBackground()).toBe('#F6F8F5');
  expect(screen.getByText('Inside')).toBeTruthy();
});

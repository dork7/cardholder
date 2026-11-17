import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { Panel, Screen, screenEntrance } from '../Surface';
import { Text } from '../Text';

let mockScheme: 'light' | 'dark' = 'light';
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: () => mockScheme,
}));

const panelStyle = () => StyleSheet.flatten(screen.getByTestId('panel').props.style);

test('screen entrance is omitted under Reduce Motion', () => {
  expect(screenEntrance(true)).toBeUndefined();
  expect(screenEntrance(false)).toBeDefined();
});

test.each([
  ['light', 'rgba(255, 255, 255, 0.82)'],
  ['dark', 'rgba(35, 49, 73, 0.84)'],
] as const)('in %s mode a panel is a rounded glass surface', async (scheme, surface) => {
  mockScheme = scheme;
  await render(
    <Screen>
      <Panel testID="panel">
        <Text>Inside</Text>
      </Panel>
    </Screen>,
  );
  expect(panelStyle().backgroundColor).toBe(surface);
  expect(panelStyle().borderRadius).toBe(20);
  expect(panelStyle().borderWidth).toBe(1);
  expect(panelStyle().shadowOpacity).toBe(0.035);
  expect(panelStyle().shadowRadius).toBe(15);
  expect(screen.getByText('Inside')).toBeTruthy();
});

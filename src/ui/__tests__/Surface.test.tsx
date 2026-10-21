import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { Panel, Screen } from '../Surface';
import { Text } from '../Text';

let mockScheme: 'light' | 'dark' = 'light';
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: () => mockScheme,
}));

const panelStyle = () => StyleSheet.flatten(screen.getByTestId('panel').props.style);

test.each([
  ['light', '#F6F8F5'],
  ['dark', '#1E1E1E'],
] as const)('in %s mode a panel is a solid surface one step up from the page', async (scheme, surface) => {
  mockScheme = scheme;
  await render(
    <Screen>
      <Panel testID="panel">
        <Text>Inside</Text>
      </Panel>
    </Screen>,
  );
  expect(panelStyle().backgroundColor).toBe(surface);
  expect(panelStyle().boxShadow).toBeUndefined();
  expect(screen.getByText('Inside')).toBeTruthy();
});

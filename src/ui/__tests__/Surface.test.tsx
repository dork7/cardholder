import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { ActionFooter, Panel, Screen } from '../Surface';
import { TYPE } from '../theme';
import { Text } from '../Text';

let mockScheme: 'light' | 'dark' = 'light';
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: () => mockScheme,
}));

const panelStyle = () => StyleSheet.flatten(screen.getByTestId('panel').props.style);

test.each([
  ['light', 'rgba(255, 255, 255, 0.82)'],
  ['dark', 'rgba(44, 44, 51, 0.84)'],
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
  expect(screen.getByText('Inside')).toBeTruthy();
});

test('a panel has the prototype white 1 px border and soft shadow', async () => {
  mockScheme = 'light';
  await render(<Screen><Panel testID="panel"><Text>x</Text></Panel></Screen>);
  expect(panelStyle().borderWidth).toBe(1);
  expect(panelStyle().shadowOpacity).toBeLessThan(0.05);
});

test('screen content sits in an entrance wrapper and the title is 31', async () => {
  mockScheme = 'light';
  await render(<Screen><Text>Inside</Text></Screen>);
  expect(screen.getByTestId('screen-content')).toBeTruthy();
  expect(TYPE.title).toBe(31);
});

test('an action footer is a translucent page-coloured bar', async () => {
  mockScheme = 'dark';
  await render(<Screen><ActionFooter testID="footer"><Text>Save</Text></ActionFooter></Screen>);
  expect(StyleSheet.flatten(screen.getByTestId('footer').props.style).backgroundColor).toBe('rgba(16, 24, 39, 0.82)');
});

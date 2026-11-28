import { act, render, screen } from '@testing-library/react-native';
import { Keyboard, Platform, StyleSheet, Text } from 'react-native';
import { Sheet } from '../Sheet';

jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 24, left: 0, right: 0 }) }));

const listeners: Record<string, (e: unknown) => void> = {};
beforeEach(() => {
  jest.spyOn(Keyboard, 'addListener').mockImplementation(((event: string, listener: (e: unknown) => void) => {
    listeners[event] = listener;
    return { remove: jest.fn() };
  }) as never);
});
afterEach(() => jest.restoreAllMocks());

const sheetStyle = () => StyleSheet.flatten(screen.getByTestId('sheet').props.style);

describe('on Android (#91)', () => {
  const os = Platform.OS;
  beforeAll(() => { Platform.OS = 'android'; });
  afterAll(() => { Platform.OS = os; });

  test('a sheet with a text field moves up by the keyboard height, and back down when it closes', async () => {
    await render(<Sheet visible onClose={() => {}} avoidKeyboard testID="sheet"><Text>Tag</Text></Sheet>);
    expect(sheetStyle()).toMatchObject({ marginBottom: 0, paddingBottom: 40 });
    await act(async () => listeners.keyboardDidShow({ endCoordinates: { height: 300 } }));
    expect(sheetStyle()).toMatchObject({ marginBottom: 300, paddingBottom: 16 });
    await act(async () => listeners.keyboardDidHide({}));
    expect(sheetStyle()).toMatchObject({ marginBottom: 0, paddingBottom: 40 });
  });

  test('a sheet without a text field stays put', async () => {
    await render(<Sheet visible onClose={() => {}} testID="sheet"><Text>Sort</Text></Sheet>);
    await act(async () => listeners.keyboardDidShow({ endCoordinates: { height: 300 } }));
    expect(sheetStyle()).toMatchObject({ marginBottom: 0 });
  });
});

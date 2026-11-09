import { render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Platform } from 'react-native';
import { LiveText } from '../LiveText';

// iOS has no live regions, so VoiceOver is told directly; Android reads the live region itself.
describe.each([
  ['ios', 1],
  ['android', 0],
] as const)('on %s', (os, spoken) => {
  const realOS = Platform.OS;
  let announce: jest.SpyInstance;
  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', { get: () => os, configurable: true });
    announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
  });
  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { get: () => realOS, configurable: true });
    announce.mockRestore();
  });

  test('the text is a polite live region, announced to VoiceOver when it appears and when it changes', async () => {
    await render(<LiveText testID="status">No cards match</LiveText>);
    expect(screen.getByTestId('status').props.accessibilityLiveRegion).toBe('polite');
    expect(announce).toHaveBeenCalledTimes(spoken);
    await screen.rerender(<LiveText testID="status">No cards match</LiveText>);
    expect(announce).toHaveBeenCalledTimes(spoken);
    await screen.rerender(<LiveText testID="status">2 selected</LiveText>);
    expect(announce).toHaveBeenCalledTimes(spoken * 2);
    if (spoken) expect(announce).toHaveBeenLastCalledWith('2 selected');
  });
});

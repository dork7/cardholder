import { useEffect } from 'react';
import { AccessibilityInfo, Platform, TextProps } from 'react-native';
import { Text } from './Text';

// Tells screen readers about a status that changed without the user moving to it: progress, a result,
// an error. Android has live regions (`accessibilityLiveRegion`); iOS has none, so VoiceOver is told
// directly. Android is left to its live region, so nothing is read twice.
export function useAnnounce(message: string | null | undefined | false) {
  useEffect(() => {
    if (Platform.OS === 'ios' && message) AccessibilityInfo.announceForAccessibility(message);
  }, [message]);
}

// A line of text that is read out when it appears or changes, on both platforms.
export function LiveText({ children, ...props }: Omit<TextProps, 'children'> & { children: string }) {
  useAnnounce(children);
  return (
    <Text {...props} accessibilityLiveRegion="polite">
      {children}
    </Text>
  );
}

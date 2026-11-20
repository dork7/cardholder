import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { Settings } from '../storage/settings';
import { strings } from '../strings';
import { Text } from './Text';
import { TYPE, useTheme } from './theme';

export type GestureTipName = 'documents';

// The one-time gesture tips, kept in settings as a comma-separated record: a tip's name once it was
// dismissed or its gesture used, and `<name>.read` once it was read out to screen readers.
export function useGestureTips(settings: Settings) {
  // Null until the record is loaded, so a tip never flashes up for someone who has seen it.
  const [seen, setSeen] = useState<ReadonlySet<string> | null>(null);
  const current = useRef<ReadonlySet<string> | null>(null);
  // Entries added before the record loaded, merged into it once it does.
  const early = useRef(new Set<string>());

  useEffect(() => {
    let live = true;
    const save = (all: ReadonlySet<string>) =>
      settings.set('seenTips', [...all].join(',')).catch((e) => console.warn('Saving seen tips failed', e));
    settings
      .get('seenTips')
      .catch(() => null)
      .then((saved) => {
        if (!live) return;
        const stored = new Set(saved ? saved.split(',') : []);
        const all = new Set([...stored, ...early.current]);
        current.current = all;
        setSeen(all);
        if (all.size > stored.size) void save(all);
      });
    return () => {
      live = false;
    };
  }, [settings]);

  const mark = useCallback(
    (entry: string) => {
      const now = current.current;
      if (!now) {
        early.current.add(entry);
        return;
      }
      if (now.has(entry)) return;
      const next = new Set(now).add(entry);
      current.current = next;
      setSeen(next);
      settings.set('seenTips', [...next].join(',')).catch((e) => console.warn('Saving seen tips failed', e));
    },
    [settings],
  );

  return {
    showing: (tip: GestureTipName) => seen !== null && !seen.has(tip),
    // The gesture was used or the tip dismissed: it doesn't come back.
    done: (tip: GestureTipName) => mark(tip),
    announced: (tip: GestureTipName) => seen === null || seen.has(`${tip}.read`),
    markAnnounced: (tip: GestureTipName) => mark(`${tip}.read`),
  };
}

interface Props {
  text: string;
  announce: boolean; // read out when it appears: only the first time it is ever shown
  onAnnounced: () => void;
  onDismiss: () => void;
  testID?: string;
}

// A small bar above the list that names a gesture sighted users couldn't otherwise discover.
export function GestureTip({ text, announce, onAnnounced, onDismiss, testID }: Props) {
  const theme = useTheme();
  // Decided when the tip first shows, so marking it as read doesn't silence it mid-announcement.
  const [readOut] = useState(announce);
  useEffect(() => {
    if (!readOut) return;
    // Android reads the live region below; iOS has none, so VoiceOver is told directly.
    if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(text);
    onAnnounced();
    // Once per showing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOut]);
  // Reanimated skips the fade under Reduce Motion.
  return (
    <Animated.View entering={FadeIn.duration(240)} testID={testID}>
      <View style={[styles.bar, { backgroundColor: theme.bannerBg, borderColor: theme.border }]}>
        <Text style={[styles.text, { color: theme.bannerText }]} accessibilityLiveRegion={readOut ? 'polite' : 'none'}>
          {text}
        </Text>
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel={strings.home.dismissTip}
          hitSlop={8}
          style={({ pressed }) => [styles.close, { opacity: pressed ? 0.6 : 1 }]}
          testID={testID && `${testID}-dismiss`}
        >
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path d="M6 6l12 12M18 6L6 18" stroke={theme.bannerText} strokeWidth={2} strokeLinecap="round" />
          </Svg>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    paddingLeft: 16,
    paddingRight: 0,
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: { flex: 1, fontSize: TYPE.secondary },
  close: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

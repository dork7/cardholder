import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { strings } from '../strings';
import { Text } from './Text';
import { RADIUS, TYPE, useTheme } from './theme';
import { GlassSurface } from './Surface';
import { RetroIcon, RetroIconName } from './RetroIcon';

export type TabKey = 'home' | 'documents' | 'notes' | 'spaces';

const TABS: { key: TabKey; label: string; icon: RetroIconName; href: '/' | '/documents' | '/notes' | '/spaces' }[] = [
  { key: 'home', label: strings.tabs.home, icon: 'home', href: '/' },
  { key: 'documents', label: strings.tabs.documents, icon: 'folder', href: '/documents' },
  { key: 'notes', label: strings.tabs.notes, icon: 'note', href: '/notes' },
  { key: 'spaces', label: strings.tabs.spaces, icon: 'spaces', href: '/spaces' },
];

// Height of the bar itself, and the gap kept under and above it; the + button floats above all that.
const TAB_BAR_HEIGHT = 68;
const GAP = 12;

function useTabBarHeight(): number {
  const { fontScale } = useWindowDimensions();
  return TAB_BAR_HEIGHT + Math.ceil(Math.max(0, fontScale - 1) * 2 * TYPE.caption);
}

// How far up from the screen's bottom edge a floating control must sit to clear the bar.
export function useTabBarClearance(): number {
  const { bottom } = useSafeAreaInsets();
  return bottom + GAP + useTabBarHeight() + GAP;
}

interface Props {
  active: TabKey;
}

// The four root destinations as a floating glass bar. In normal layout flow, so a screen's content
// above it is never covered. The current tab is announced as selected; replacing (not pushing)
// keeps the stack at one root screen, so Back never walks between tabs.
export function TabBar({ active }: Props) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const height = useTabBarHeight();
  return (
    <View style={[styles.dock, { paddingBottom: insets.bottom + GAP, paddingLeft: insets.left + 16, paddingRight: insets.right + 16 }]}>
      <GlassSurface testID="tab-bar" style={[styles.bar, { height }]} strong>
        <View accessibilityRole="tablist" style={styles.row}>
          {TABS.map((tab) => {
            const selected = tab.key === active;
            const color = selected ? theme.accent : theme.muted;
            return (
              <Pressable
                key={tab.key}
                testID={`tab-${tab.key}`}
                accessibilityRole="tab"
                accessibilityLabel={tab.label}
                accessibilityState={{ selected }}
                onPress={() => { if (!selected) router.replace(tab.href); }}
                style={({ pressed }) => [styles.tab, {
                  backgroundColor: selected ? theme.bannerBg : 'transparent',
                  opacity: pressed ? 0.65 : 1,
                }]}
              >
                <RetroIcon name={tab.icon} size={24} color={color} />
                <Text numberOfLines={2} style={[styles.caption, { color }]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: { paddingTop: GAP },
  bar: { borderRadius: RADIUS.lg, padding: 6, justifyContent: 'center' },
  row: { flexDirection: 'row', gap: 4, flex: 1 },
  tab: { flex: 1, minHeight: 48, borderRadius: RADIUS.md + 2, alignItems: 'center', justifyContent: 'center', gap: 2 },
  caption: { fontSize: TYPE.caption, fontWeight: '600', textAlign: 'center' },
});

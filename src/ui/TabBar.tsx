import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { strings } from '../strings';
import { Text } from './Text';
import { RADIUS, TYPE, useTheme } from './theme';
import { GlassSurface } from './Surface';
import { RetroIcon, RetroIconName } from './RetroIcon';

export type TabKey = 'documents' | 'notes' | 'settings';

const TABS: { key: TabKey; label: string; icon: RetroIconName; href: '/' | '/notes' | '/settings' }[] = [
  { key: 'documents', label: strings.tabs.documents, icon: 'documents', href: '/' },
  { key: 'notes', label: strings.tabs.notes, icon: 'note', href: '/notes' },
  { key: 'settings', label: strings.tabs.settings, icon: 'settings', href: '/settings' },
];

// Height of the bar itself, and the gap kept under and above it; the + button floats above all that.
export const TAB_BAR_HEIGHT = 68;
const GAP = 12;

// How far up from the screen's bottom edge a floating control must sit to clear the bar.
export function useTabBarClearance(): number {
  return useSafeAreaInsets().bottom + GAP + TAB_BAR_HEIGHT + GAP;
}

interface Props {
  active: TabKey;
}

// The three root destinations as a floating glass bar. In normal layout flow, so a screen's content
// above it is never covered. The current tab is announced as selected; replacing (not pushing)
// keeps the stack at one root screen, so Back never walks between tabs.
export function TabBar({ active }: Props) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.dock, { paddingBottom: insets.bottom + GAP }]}>
      <GlassSurface testID="tab-bar" style={styles.bar} strong>
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
                <Text style={[styles.caption, { color }]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: { paddingHorizontal: 16, paddingTop: GAP },
  bar: { height: TAB_BAR_HEIGHT, borderRadius: RADIUS.lg, padding: 6, justifyContent: 'center' },
  row: { flexDirection: 'row', gap: 4, flex: 1 },
  tab: { flex: 1, minHeight: 44, borderRadius: RADIUS.md + 2, alignItems: 'center', justifyContent: 'center', gap: 2 },
  caption: { fontSize: TYPE.caption, fontWeight: '600', textAlign: 'center' },
});

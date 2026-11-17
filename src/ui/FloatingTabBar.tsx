import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FOLDERS_ENABLED } from '../config';
import { strings } from '../strings';
import { Text } from './Text';
import { RADIUS, SHADOW, TYPE, useTheme } from './theme';
import { GlassSurface } from './Surface';
import { RetroIcon, RetroIconName } from './RetroIcon';

export type TabKey = 'home' | 'notes' | 'folders' | 'settings';

const TABS: { key: TabKey; label: () => string; href: '/' | '/notes' | '/folders' | '/settings'; icon: RetroIconName; testID: string }[] = [
  { key: 'home', label: () => strings.tabs.documents, href: '/', icon: 'documents', testID: 'tab-home' },
  { key: 'notes', label: () => strings.notes.title, href: '/notes', icon: 'note', testID: 'tab-notes' },
  { key: 'folders', label: () => strings.folders.title, href: '/folders', icon: 'folder', testID: 'tab-folders' },
  { key: 'settings', label: () => strings.home.settings, href: '/settings', icon: 'settings', testID: 'tab-settings' },
];

// Height of the bar's content, so floating buttons can sit above it.
export const TAB_BAR_HEIGHT = 72;

// The floating glass navigation of the root screens, as in the fluid glass prototype's nav().
// Sits in normal layout flow so a screen's last row is never covered. Folders only shows while enabled.
export function FloatingTabBar({ active }: { active: TabKey }) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabs = TABS.filter((t) => FOLDERS_ENABLED || t.key !== 'folders');
  return (
    <View style={[styles.dock, { paddingBottom: insets.bottom + 16 }]} accessibilityRole="tablist">
      <GlassSurface testID="tab-bar" style={styles.bar} strong>
        {tabs.map((tab) => {
          const on = tab.key === active;
          const color = on ? theme.accent : theme.muted;
          return (
            <Pressable key={tab.key} testID={tab.testID}
              // Root screens replace each other, so Back leaves the app instead of walking tab history.
              onPress={() => { if (!on) router.replace(tab.href); }}
              accessibilityRole="tab" accessibilityLabel={tab.label()} accessibilityState={{ selected: on }}
              style={({ pressed }) => [styles.tab, { backgroundColor: on ? theme.bannerBg : 'transparent', opacity: pressed ? 0.65 : 1 }]}>
              <RetroIcon name={tab.icon} size={24} color={color} />
              <Text style={[styles.label, { color, fontWeight: on ? '700' : '600' }]}>{tab.label()}</Text>
            </Pressable>
          );
        })}
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: { paddingHorizontal: 16, paddingTop: 8 },
  bar: { flexDirection: 'row', gap: 4, padding: 6, borderRadius: RADIUS.lg, ...SHADOW.heavy },
  tab: { flex: 1, minHeight: 60, paddingVertical: 6, gap: 2, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: TYPE.caption, textAlign: 'center' },
});

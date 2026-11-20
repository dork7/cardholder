import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useApp } from '../app/AppProvider';
import { canAddCard } from '../purchases/limits';
import { SpaceId } from '../spaces/spaces';
import { strings } from '../strings';
import { ActionSheet } from '../ui/ActionSheet';
import { Fab } from '../ui/Fab';
import { RetroIcon, RetroIconName } from '../ui/RetroIcon';
import { Text } from '../ui/Text';
import { RADIUS, TYPE, useTheme } from '../ui/theme';

export function useShowcaseAdd(spaceId?: SpaceId) {
  const { cards, unlocked } = useApp();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const suffix = spaceId ? `?space=${spaceId}` : '';
  return {
    open: () => setVisible(true),
    sheet: <ActionSheet visible={visible} title="Add to your library" onClose={() => setVisible(false)} testID="showcase-add"
      actions={[
        { key: 'document', icon: 'pdf', label: strings.home.addCard, onPress: () => router.push(canAddCard(cards.length, unlocked) ? `/edit/new${suffix}` : '/paywall'), testID: 'showcase-add-document' },
        { key: 'note', icon: 'edit', label: strings.notes.add, onPress: () => router.push(`/note/new${suffix}`), testID: 'showcase-add-note' },
      ]} />,
  };
}

export function ShowcaseAdd({ spaceId }: { spaceId?: SpaceId }) {
  const add = useShowcaseAdd(spaceId);
  return <><Fab label="Add document or note" onPress={add.open} testID="showcase-add-button" />{add.sheet}</>;
}

export function ShowcaseIcon({ icon, label, onPress, testID }: {
  icon: RetroIconName;
  label: string;
  onPress(): void;
  testID?: string;
}) {
  const theme = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} testID={testID}
    style={({ pressed }) => [styles.icon, { backgroundColor: theme.glassStrong, opacity: pressed ? 0.65 : 1 }]}>
    <RetroIcon name={icon} size={23} color={theme.text} />
  </Pressable>;
}

export function ShowcaseHeader({ title, subtitle, children }: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  const theme = useTheme();
  return <View style={styles.header}>
    <View style={styles.heading}>
      <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{title}</Text>
      {subtitle && <Text style={{ color: theme.muted, fontSize: TYPE.caption }}>{subtitle}</Text>}
    </View>
    <View style={styles.controls}>{children}</View>
  </View>;
}

const styles = StyleSheet.create({
  icon: { minWidth: 48, minHeight: 48, borderRadius: RADIUS.control, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  heading: { flex: 1, minWidth: 90 },
  title: { fontSize: TYPE.title, fontWeight: '700' },
  controls: { flexDirection: 'row', gap: 8 },
});

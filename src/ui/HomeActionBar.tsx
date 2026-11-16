import { Pressable, StyleSheet } from 'react-native';
import { strings } from '../strings';
import { Text } from './Text';
import { RADIUS, SHADOW, TYPE, useTheme } from './theme';
import { GlassSurface } from './Surface';
import { RetroIcon, RetroIconName } from './RetroIcon';

interface Props {
  gallery: boolean;
  onAddImage(): void;
  onNotes(): void;
  onToggleGallery(): void;
}

// In normal layout flow so even the last gallery row stays clear of the floating controls.
export function HomeActionBar({ gallery, onAddImage, onNotes, onToggleGallery }: Props) {
  const theme = useTheme();
  const actions = [
    { key: 'add-card', label: strings.home.addImage, onPress: onAddImage, primary: true, icon: 'plus' },
    { key: 'open-notes', label: strings.notes.title, onPress: onNotes, primary: false, icon: 'note' },
    { key: 'gallery-toggle', label: strings.home.galleryLabel, onPress: onToggleGallery, primary: false, icon: 'gallery' },
  ];
  return (
    <GlassSurface testID="home-action-bar" style={styles.bar} strong>
      {actions.map((action) => {
        const isGallery = action.key === 'gallery-toggle';
        const color = action.primary ? theme.onAccent : isGallery && gallery ? theme.accent : theme.muted;
        return (
          <Pressable key={action.key} testID={action.key} onPress={action.onPress}
            accessibilityRole={isGallery ? 'switch' : 'button'}
            accessibilityLabel={isGallery ? strings.home.galleryView : action.label}
            accessibilityHint={isGallery ? strings.home.galleryViewHint : undefined}
            accessibilityState={isGallery ? { checked: gallery } : undefined}
            style={({ pressed }) => [styles.action, {
              backgroundColor: action.primary ? theme.accent : 'transparent',
              borderColor: 'transparent',
              opacity: pressed ? 0.65 : 1,
            }]}>
            <RetroIcon name={action.icon as RetroIconName} size={24} color={color} />
            <Text style={[styles.caption, { color }]}>{action.label}</Text>
          </Pressable>
        );
      })}
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', gap: 8, padding: 8, borderRadius: RADIUS.lg, ...SHADOW.heavy },
  action: { flex: 1, minHeight: 64, paddingHorizontal: 4, paddingVertical: 8, gap: 4,
    borderWidth: 1, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  caption: { fontSize: TYPE.secondary, fontWeight: '600', textAlign: 'center' },
});

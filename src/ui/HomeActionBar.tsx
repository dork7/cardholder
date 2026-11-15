import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { strings } from '../strings';
import { Text } from './Text';
import { RADIUS, SHADOW, TYPE, useTheme } from './theme';

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
    { key: 'add-card', label: strings.home.addImage, onPress: onAddImage, primary: true,
      path: 'M14 4H4v16h16V10M4 16l5-5 5 5 3-3 3 3M18 2v8M14 6h8M8 7h.01' },
    { key: 'open-notes', label: strings.notes.title, onPress: onNotes, primary: false,
      path: 'M14 3H5v18h14V8l-5-5v5h5M8 12h8M8 16h8' },
    { key: 'gallery-toggle', label: strings.home.galleryLabel, onPress: onToggleGallery, primary: false,
      path: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z' },
  ];
  return (
    <View testID="home-action-bar" style={[styles.bar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {actions.map((action) => {
        const isGallery = action.key === 'gallery-toggle';
        const color = action.primary ? theme.onAccent : theme.text;
        return (
          <Pressable key={action.key} testID={action.key} onPress={action.onPress}
            accessibilityRole={isGallery ? 'switch' : 'button'}
            accessibilityLabel={isGallery ? strings.home.galleryView : action.label}
            accessibilityHint={isGallery ? strings.home.galleryViewHint : undefined}
            accessibilityState={isGallery ? { checked: gallery } : undefined}
            style={({ pressed }) => [styles.action, {
              backgroundColor: action.primary ? theme.accent : 'transparent',
              borderColor: isGallery && gallery ? theme.accent : 'transparent',
              opacity: pressed ? 0.65 : 1,
            }]}>
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" accessible={false}>
              <Path d={action.path} stroke={color} strokeWidth={1.75} strokeLinecap="square" strokeLinejoin="miter" />
            </Svg>
            <Text style={[styles.caption, { color }]}>{action.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', gap: 8, padding: 8, borderWidth: StyleSheet.hairlineWidth, borderRadius: RADIUS.none, ...SHADOW.heavy },
  action: { flex: 1, minHeight: 64, paddingHorizontal: 4, paddingVertical: 8, gap: 4,
    borderWidth: 1, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  caption: { fontSize: TYPE.secondary, fontWeight: '600', textAlign: 'center' },
});

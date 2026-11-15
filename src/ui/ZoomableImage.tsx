import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureDetector, usePinchGesture, useSimultaneousGestures, useTapGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { strings } from '../strings';
import { Text } from './Text';
import { useTheme } from './theme';

const MAX_ZOOM = 4;
// What a double-tap zooms to: enough to read the small print on an ID.
export const TAP_ZOOM = 2.5;

interface ZoomableImageProps {
  uri: string | null; // null while the picture is still being decrypted
  accessibilityLabel: string;
}

// Fills its parent. Pinch to zoom, or double-tap to zoom in and back out, so a pinch is never the
// only way; screen readers get zoom in / zoom out as actions.
export function ZoomableImage({ uri, accessibilityLabel }: ZoomableImageProps) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const saved = useSharedValue(1);

  const zoomTo = (value: number) => {
    'worklet';
    saved.value = value;
    scale.value = reducedMotion ? value : withTiming(value);
  };

  const pinch = usePinchGesture({
    onUpdate: (e) => {
      'worklet';
      scale.value = Math.min(Math.max(saved.value * e.scale, 1), MAX_ZOOM);
    },
    onDeactivate: () => {
      'worklet';
      saved.value = scale.value;
    },
  });
  const toggle = useTapGesture({
    numberOfTaps: 2,
    onActivate: () => {
      'worklet';
      zoomTo(saved.value > 1 ? 1 : TAP_ZOOM);
    },
  });
  const gesture = useSimultaneousGestures(pinch, toggle);

  const zoomed = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (!uri) {
    return (
      <View style={[styles.fill, styles.empty, { backgroundColor: theme.surface }]} accessibilityLabel={strings.card.loading} accessible>
        <ActivityIndicator color={theme.accent} />
        <Text style={{ color: theme.muted }}>{strings.card.loading}</Text>
      </View>
    );
  }

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.fill, zoomed]}>
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={strings.card.zoomHint}
          accessibilityActions={[
            { name: 'zoomIn', label: strings.card.zoomIn },
            { name: 'zoomOut', label: strings.card.zoomOut },
          ]}
          onAccessibilityAction={(e) => zoomTo(e.nativeEvent.actionName === 'zoomIn' ? TAP_ZOOM : 1)}
          accessible
        />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignSelf: 'stretch' },
  empty: { alignItems: 'center', justifyContent: 'center', gap: 8 },
});

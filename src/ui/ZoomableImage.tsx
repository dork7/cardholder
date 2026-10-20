import { StyleSheet, View } from 'react-native';
import { GestureDetector, usePinchGesture, useSimultaneousGestures, useTapGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { strings } from '../strings';
import { Text } from './Text';
import { useTheme } from './theme';

const MAX_ZOOM = 4;

interface ZoomableImageProps {
  uri: string | null;
  accessibilityLabel: string;
}

// Fills its parent. Pinch to zoom in, double-tap to reset.
export function ZoomableImage({ uri, accessibilityLabel }: ZoomableImageProps) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const saved = useSharedValue(1);

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
  const reset = useTapGesture({
    numberOfTaps: 2,
    onActivate: () => {
      'worklet';
      saved.value = 1;
      scale.value = withTiming(1);
    },
  });
  const gesture = useSimultaneousGestures(pinch, reset);

  const zoomed = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (!uri) {
    return (
      <View style={[styles.fill, styles.empty, { backgroundColor: theme.surface }]}>
        <Text style={{ color: theme.muted }}>{strings.edit.noImage}</Text>
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
          accessible
        />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignSelf: 'stretch' },
  empty: { alignItems: 'center', justifyContent: 'center' },
});

import * as React from 'react';
import { StyleSheet, View, Pressable, Alert } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import {
  PinchGestureHandler,
  GestureHandlerRootView,
  TapGestureHandler,
} from 'react-native-gesture-handler';
import { Image } from 'expo-image';
import { strings } from '../../src/strings';
import { useTheme } from '../theme';

interface ZoomableImageProps {
  uri: string | null;
  onTap?: () => void;
  testID?: string;
}

export function ZoomableImage({ uri, onTap, testID }: ZoomableImageProps) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value) }],
  }));

  const pinchHandler = (event: any) => {
    scale.value = savedScale.value * event.nativeEvent.scale;
  };

  const pinchHandlerEnd = () => {
    savedScale.value = scale.value;
  };

  const tapHandler = () => {
    if (onTap) {
      onTap();
    }
  };

  if (!uri) {
    return (
      <View style={[styles.container, { backgroundColor: theme.surface }]}>
        <Text style={{ color: theme.muted }}>{strings.edit.noImage}</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TapGestureHandler onHandlerStateChange={tapHandler}>
        <Animated.View style={styles.container}>
          <PinchGestureHandler
            onGestureEvent={pinchHandler}
            onHandlerStateChange={pinchHandlerEnd}
          >
            <Animated.View style={[styles.container, animatedStyle]}>
              <Image
                source={{ uri }}
                style={styles.image}
                contentFit="contain"
                cachePolicy="disk"
              />
            </Animated.View>
          </PinchGestureHandler>
        </Animated.View>
      </TapGestureHandler>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});

import { Text } from './Text';

import { useState } from 'react';
import { Image, LayoutChangeEvent, StyleSheet, View } from 'react-native';

interface Size {
  width: number;
  height: number;
}

// The rotated picture's box: the slot's width and height swapped, centred on the slot, so turning it
// a quarter turn makes it cover the slot exactly.
export function sidewaysBox({ width, height }: Size) {
  return { width: height, height: width, left: (width - height) / 2, top: (height - width) / 2 };
}

// A card's picture filling a landscape slot (the home stack, the gallery, the pinned strip). A vertical
// card is turned a quarter turn anticlockwise, its top to the left, so it fills the slot instead of
// being cut to its middle; it stands upright again on the card's own screen.
export function CardPicture({ uri, vertical }: { uri: string; vertical: boolean }) {
  const [slot, setSlot] = useState<Size | null>(null);
  if (!vertical) return <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />;
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== slot?.width || height !== slot?.height) setSlot({ width, height });
  };
  return (
    <View style={StyleSheet.absoluteFill} onLayout={onLayout}>
      {slot && (
        <Image
          source={{ uri }}
          resizeMode="cover"
          style={[styles.turned, sidewaysBox(slot)]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  turned: { position: 'absolute', transform: [{ rotate: '-90deg' }] },
});

import { useState } from 'react';
import { Image, ImageStyle, LayoutChangeEvent, StyleProp, StyleSheet, View } from 'react-native';

interface Size {
  width: number;
  height: number;
}

// The rotated picture's box: the slot's width and height swapped, centred on the slot, so turning it
// a quarter turn makes it cover the slot exactly.
export function sidewaysBox({ width, height }: Size) {
  return { width: height, height: width, left: (width - height) / 2, top: (height - width) / 2 };
}

interface Props {
  uri: string | null;
  // A sharper copy laid over `uri` once it has loaded. The two are separate images, so swapping to
  // it (or dropping it) never blanks the picture: the one underneath stays on screen meanwhile.
  sharpUri?: string | null;
  vertical: boolean;
  // Rounded on the image itself too, so the corners are cut even where the parent's clipping is lost
  // (a card mid-swipe or mid-flip on Android).
  radius?: number;
}

// A card's picture filling a landscape slot (the home stack, the gallery, the pinned strip). A vertical
// card is turned a quarter turn anticlockwise, its top to the left, so it fills the slot instead of
// being cut to its middle; it stands upright again on the card's own screen.
export function CardPicture({ uri, sharpUri, vertical, radius = 0 }: Props) {
  const [slot, setSlot] = useState<Size | null>(null);
  const layers = [uri, sharpUri].filter((u): u is string => !!u);
  if (layers.length === 0) return null;
  // No fade-in: Android fades every newly shown image in over 300 ms, which reads as a blink.
  const image = (u: string, i: number, style: StyleProp<ImageStyle>) => (
    <Image key={i} testID={i === 0 ? 'card-picture' : 'card-picture-sharp'} source={{ uri: u }} resizeMode="cover" fadeDuration={0} style={[style, { borderRadius: radius }]} />
  );
  if (!vertical) return <>{layers.map((u, i) => image(u, i, StyleSheet.absoluteFill))}</>;
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== slot?.width || height !== slot?.height) setSlot({ width, height });
  };
  return (
    <View style={StyleSheet.absoluteFill} onLayout={onLayout}>
      {slot && layers.map((u, i) => image(u, i, [styles.turned, sidewaysBox(slot)]))}
    </View>
  );
}

const styles = StyleSheet.create({
  turned: { position: 'absolute', transform: [{ rotate: '-90deg' }] },
});

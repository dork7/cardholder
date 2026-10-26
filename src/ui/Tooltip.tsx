import { useEffect, useRef, useState } from 'react';
import { HostInstance, Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from './Text';
import { SHADOW, TYPE, useTheme } from './theme';

// How long a tooltip stays up after the long press.
export const TOOLTIP_MS = 1500;
const GAP = 8; // between the button and the bubble
const EDGE = 8; // the bubble never touches the screen edge
// Buttons this close to the top (the home title bar) get their tooltip below them instead.
const BELOW_IF_ABOVE = 120;

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Icon-only buttons name themselves on a long press: the touch version of a hover tooltip.
// Spread `ref` and `onLongPress` onto the button and render `tooltip` beside it. Screen readers
// already hear the button's label, so this is for sighted users only.
export function useTooltip(label: string) {
  const ref = useRef<HostInstance>(null);
  const [anchor, setAnchor] = useState<Rect | null>(null);

  useEffect(() => {
    if (!anchor) return;
    const timer = setTimeout(() => setAnchor(null), TOOLTIP_MS);
    return () => clearTimeout(timer);
  }, [anchor]);

  const onLongPress = () => ref.current?.measureInWindow((x, y, width, height) => setAnchor({ x, y, width, height }));
  const tooltip = anchor ? <Bubble label={label} anchor={anchor} onDismiss={() => setAnchor(null)} /> : null;
  return { ref, onLongPress, tooltip };
}

// A Modal, so the bubble shows above native modal screens too (the card view, the edit sheet).
function Bubble({ label, anchor, onDismiss }: { label: string; anchor: Rect; onDismiss: () => void }) {
  const theme = useTheme();
  const window = useWindowDimensions();
  const [width, setWidth] = useState<number | null>(null);

  const centre = anchor.x + anchor.width / 2;
  const left = width === null ? 0 : Math.min(Math.max(centre - width / 2, EDGE), window.width - width - EDGE);
  const vertical =
    anchor.y < BELOW_IF_ABOVE ? { top: anchor.y + anchor.height + GAP } : { bottom: window.height - anchor.y + GAP };

  return (
    <Modal transparent animationType="fade" statusBarTranslucent onRequestClose={onDismiss}>
      {/* Any tap dismisses it early. */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} accessible={false}>
        <View
          testID="tooltip"
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          style={[
            styles.bubble,
            SHADOW.heavy,
            vertical,
            { left, maxWidth: window.width - 2 * EDGE, backgroundColor: theme.bannerBg, opacity: width === null ? 0 : 1 },
          ]}
        >
          <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bubble: { position: 'absolute', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4 },
  label: { fontSize: TYPE.secondary, fontWeight: '700' },
});

import { useLayoutEffect, useRef, useState } from 'react';
import { AccessibilityActionEvent, LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { Card } from '../cards/types';
import { strings } from '../strings';
import { JournalCard } from './JournalCard';
import { mod, releaseAction, TAP_SLOP } from './stackGeometry';
import { useTheme } from './theme';

const EASING = Easing.bezier(0.2, 0.8, 0.2, 1);
const DURATION = 320;
const PEEK = 22; // how far each card behind shows above the one in front
const MAX_BEHIND = 2;
const SCALE_STEP = 0.05;
const DOTS_H = 26;

interface Props {
  cards: Card[];
  onOpen: (card: Card) => void;
  onPin?: (card: Card) => void;
}

// Journal-style stack: the front card fills the space it is given, up to two cards peek above it,
// swiping left moves to the next card, swiping right to the previous one, and tapping opens it.
export function CardStack({ cards, onOpen, onPin }: Props) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [activeId, setActiveId] = useState<string | null>(null);
  const tx = useSharedValue(0);
  const busy = useSharedValue(false);
  const cardsRef = useRef(cards);
  cardsRef.current = cards;

  const n = cards.length;
  const active = Math.max(0, cards.findIndex((c) => c.id === activeId));
  const behind = Math.min(n - 1, MAX_BEHIND);
  const stackH = size.height - (n > 1 ? DOTS_H : 0);
  const cardH = Math.max(0, stackH - behind * PEEK);
  const duration = reduceMotion ? 0 : DURATION;

  // The front card has changed: put the new one back in the middle before it is drawn.
  useLayoutEffect(() => {
    tx.value = 0;
    busy.value = false;
  }, [active, tx, busy]);

  const step = (by: number) => {
    const list = cardsRef.current;
    const current = Math.max(0, list.findIndex((c) => c.id === activeId));
    const card = list[mod(current + by, list.length)];
    if (card) setActiveId(card.id);
  };

  const pan = usePanGesture({
    enabled: n > 1,
    activeOffsetX: [-TAP_SLOP, TAP_SLOP],
    failOffsetY: [-20, 20], // a mostly vertical move is not a swipe
    onUpdate: (e) => {
      'worklet';
      if (!busy.value) tx.value = e.translationX;
    },
    onDeactivate: (e) => {
      'worklet';
      if (busy.value) return;
      const action = e.canceled ? 0 : releaseAction(e.translationX, e.velocityX);
      if (action === 0) {
        tx.value = withTiming(0, { duration, easing: EASING });
        return;
      }
      busy.value = true;
      tx.value = withTiming(-action * size.width * 1.2, { duration, easing: EASING }, (done) => {
        if (done) scheduleOnRN(step, action);
      });
    },
  });

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { rotate: `${tx.value / 24}deg` }],
  }));

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  };

  const front = cards[active];

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    if (!front) return;
    const name = e.nativeEvent.actionName;
    if (name === 'increment') step(1);
    else if (name === 'decrement') step(-1);
    else if (name === 'activate') onOpen(front);
    else if (name === 'pin') onPin?.(front);
  };

  if (!front) return null;

  // Deepest card first so the front card is drawn on top.
  const layers = Array.from({ length: behind + 1 }, (_, i) => behind - i);

  return (
    <View style={styles.frame} onLayout={onLayout} testID="card-stack-frame">
      {cardH > 0 && (
        <GestureDetector gesture={pan}>
          <View
            style={{ height: stackH }}
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel={front.name}
            accessibilityValue={{ text: strings.home.cardOf(active + 1, n) }}
            accessibilityHint={strings.home.stackHint}
            accessibilityActions={[
              { name: 'increment' },
              { name: 'decrement' },
              { name: 'activate' },
              ...(onPin ? [{ name: 'pin', label: front.pinned ? strings.card.unpin : strings.card.pin }] : []),
            ]}
            onAccessibilityAction={onAccessibilityAction}
            testID="card-stack"
          >
            {layers.map((depth) => {
              const card = cards[mod(active + depth, n)];
              const place = { top: behind * PEEK, height: cardH };
              if (depth > 0) {
                return (
                  <View
                    key={card.id}
                    pointerEvents="none"
                    style={[
                      styles.layer,
                      place,
                      { transform: [{ translateY: -depth * PEEK }, { scale: 1 - depth * SCALE_STEP }] },
                    ]}
                  >
                    <JournalCard card={card} depth={depth} />
                  </View>
                );
              }
              return (
                <Animated.View key={card.id} style={[styles.layer, place, frontStyle]}>
                  <Pressable style={styles.fill} onPress={() => onOpen(card)} accessible={false}>
                    <JournalCard card={card} depth={0} onPin={onPin} />
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        </GestureDetector>
      )}

      {n > 1 && (
        <View style={styles.dots}>
          {cards.map((card, i) => (
            <Pressable
              key={card.id}
              onPress={() => setActiveId(card.id)}
              hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
              accessibilityRole="button"
              accessibilityLabel={strings.home.showCard(i + 1, n)}
              accessibilityState={{ selected: i === active }}
              style={[
                styles.dot,
                { backgroundColor: i === active ? theme.text : theme.muted },
                i === active && styles.dotActive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1 },
  // Scaling from the top edge keeps every peeking strip the same height.
  layer: { position: 'absolute', left: 0, right: 0, transformOrigin: '50% 0%' },
  fill: { flex: 1 },
  dots: { height: DOTS_H, flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 8 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotActive: { transform: [{ scale: 1.35 }] },
});

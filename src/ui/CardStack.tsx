import { useEffect, useRef, useState } from 'react';
import { AccessibilityActionEvent, Image, LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import {
  GestureDetector,
  useCompetingGestures,
  usePanGesture,
  useTapGesture,
} from 'react-native-gesture-handler';
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { Card } from '../cards/types';
import { useCardImage } from '../hooks/useCardImage';
import { strings } from '../strings';
import {
  cardPose,
  dragProgress,
  ID1_RADIUS,
  mod,
  releaseAction,
  rubberBand,
  slotAtX,
  stackGeometry,
  StackGeometry,
  TAP_SLOP,
} from './stackGeometry';
import { GlassPanel } from './Glass';
import { Text } from './Text';
import { TYPE, useTheme } from './theme';

const EASING = Easing.bezier(0.2, 0.8, 0.2, 1);
const DURATION = 380;

interface Props {
  cards: Card[];
  onOpen: (card: Card) => void;
}

// Wallet-style stack: the front card is fully visible, the cards behind it fan out to its right,
// swiping left sends the front card to the back, swiping right brings the previous one back,
// and tapping a strip brings that card straight to the front.
export function CardStack({ cards, onOpen }: Props) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const n = cards.length;
  const active = Math.max(0, cards.findIndex((c) => c.id === activeId));
  const geo = stackGeometry(width, n);

  // The stack's motion is a single progress value: `from` is the front card, `steps` how far the
  // stack is moving, `f` how far along it is. Every card's pose is derived from those three.
  const from = useSharedValue(active);
  const steps = useSharedValue(0);
  const f = useSharedValue(0);
  const pull = useSharedValue(0); // rightward drag on the front card
  const pullIndex = useSharedValue(active); // the card that rightward drag belongs to
  const busy = useSharedValue(false);
  const dragging = useSharedValue(false);

  const cardsRef = useRef(cards);
  cardsRef.current = cards;

  useEffect(() => {
    if (busy.value) return;
    from.value = active;
    steps.value = 0;
    f.value = 0;
  }, [active, n, busy, from, steps, f]);

  const settle = (index: number) => {
    const card = cardsRef.current[index];
    if (card) setActiveId(card.id);
  };

  const duration = reduceMotion ? 0 : DURATION;

  const finish = (to: number) => {
    'worklet';
    from.value = to;
    steps.value = 0;
    f.value = 0;
    busy.value = false;
    scheduleOnRN(settle, to);
  };

  // Move the stack `count` cards forward from wherever the progress is now.
  const advance = (count: number) => {
    'worklet';
    if (n < 2 || count <= 0) return;
    busy.value = true;
    steps.value = count;
    pull.value = withTiming(0, { duration, easing: EASING });
    const to = mod(from.value + count, n);
    f.value = withTiming(1, { duration, easing: EASING }, (done) => {
      if (done) finish(to);
    });
  };

  const goBack = () => {
    'worklet';
    if (n < 2) return;
    busy.value = true;
    const to = mod(from.value - 1, n);
    from.value = to;
    steps.value = 1;
    f.value = 1;
    pull.value = withTiming(0, { duration, easing: EASING });
    f.value = withTiming(0, { duration, easing: EASING }, (done) => {
      if (done) finish(to);
    });
  };

  const springBack = () => {
    'worklet';
    pull.value = withTiming(0, { duration, easing: EASING });
    f.value = withTiming(0, { duration, easing: EASING }, () => {
      steps.value = 0;
      busy.value = false;
    });
  };

  const select = (index: number) => {
    'worklet';
    if (busy.value || index === from.value) return;
    advance(mod(index - from.value, n));
  };

  const tapAt = (x: number) => {
    const k = slotAtX(x, geo);
    if (k === 0) {
      const card = cardsRef.current[active];
      if (card) onOpen(card);
    } else {
      select(mod(active + k, n));
    }
  };

  const pan = usePanGesture({
    enabled: n > 1,
    activeOffsetX: [-TAP_SLOP, TAP_SLOP],
    failOffsetY: [-20, 20], // a mostly vertical move is not a swipe
    onActivate: () => {
      'worklet';
      dragging.value = !busy.value;
      if (!dragging.value) return;
      busy.value = true;
      pullIndex.value = from.value;
    },
    onUpdate: (e) => {
      'worklet';
      if (!dragging.value) return;
      if (e.translationX < 0) {
        steps.value = 1;
        f.value = dragProgress(e.translationX, geo.fly);
        pull.value = 0;
      } else {
        f.value = 0;
        pull.value = rubberBand(e.translationX) * 0.5;
      }
    },
    onDeactivate: (e) => {
      'worklet';
      if (!dragging.value) return;
      dragging.value = false;
      const action = e.canceled ? 0 : releaseAction(e.translationX, e.velocityX);
      if (action === 1) advance(1);
      else if (action === -1) goBack();
      else springBack();
    },
  });

  const tap = useTapGesture({
    runOnJS: true,
    maxDistance: TAP_SLOP,
    onActivate: (e) => {
      if (!busy.value) tapAt(e.x);
    },
  });

  const gesture = useCompetingGestures(pan, tap);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'increment') select(mod(active + 1, n));
    else if (e.nativeEvent.actionName === 'decrement' && !busy.value) goBack();
    else if (e.nativeEvent.actionName === 'activate') tapAt(0);
  };

  const front = cards[active];
  if (!front) return null;

  return (
    <View onLayout={onLayout} testID="card-stack-frame">
      {width > 0 && (
        <GestureDetector gesture={gesture}>
          <View
            style={{ height: geo.height }}
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel={front.name}
            accessibilityValue={{ text: strings.home.cardOf(active + 1, n) }}
            accessibilityHint={strings.home.stackHint}
            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }, { name: 'activate' }]}
            onAccessibilityAction={onAccessibilityAction}
            testID="card-stack"
          >
            {cards.map((card, i) => (
              <StackCard key={card.id} card={card} index={i} n={n} geo={geo} motion={{ from, steps, f, pull, pullIndex }} />
            ))}
          </View>
        </GestureDetector>
      )}

      <GlassPanel style={styles.info}>
        <View style={styles.caption}>
          <Text style={{ fontSize: TYPE.section, fontWeight: '600', color: theme.text }} numberOfLines={1}>
            {front.name}
          </Text>
          <Text style={{ fontSize: TYPE.secondary, color: theme.muted }}>{strings.categories[front.category]}</Text>
        </View>

        {n > 1 && (
          <View style={styles.dots}>
            {cards.map((card, i) => (
              <Pressable
                key={card.id}
                onPress={() => select(i)}
                hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
                accessibilityRole="button"
                accessibilityLabel={strings.home.showCard(i + 1, n)}
                accessibilityState={{ selected: i === active }}
                style={[
                  styles.dot,
                  { backgroundColor: i === active ? theme.text : theme.muted }, // `rosette` drops below 3:1 on glass
                  i === active && styles.dotActive,
                ]}
              />
            ))}
          </View>
        )}
      </GlassPanel>
    </View>
  );
}

interface Motion {
  from: SharedValue<number>;
  steps: SharedValue<number>;
  f: SharedValue<number>;
  pull: SharedValue<number>;
  pullIndex: SharedValue<number>;
}

function StackCard({ card, index, n, geo, motion }: { card: Card; index: number; n: number; geo: StackGeometry; motion: Motion }) {
  const theme = useTheme();
  const uri = useCardImage(card, 'thumb');
  const { from, steps, f, pull, pullIndex } = motion;
  const { fly } = geo;

  const animated = useAnimatedStyle(() => {
    const pose = cardPose(index, n, from.value, steps.value, f.value, fly);
    const extra = index === pullIndex.value ? pull.value : 0;
    return {
      zIndex: pose.z,
      opacity: pose.opacity,
      transform: [{ translateX: pose.tx + extra }, { rotate: `${pose.rotate}deg` }, { scale: pose.scale }],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.card,
        {
          width: geo.cardW,
          height: geo.cardH,
          borderRadius: geo.cardW * ID1_RADIUS,
          backgroundColor: theme.surface,
        },
        animated,
      ]}
    >
      {uri && <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Scaling from the right edge keeps every peeking strip the same width.
  card: { position: 'absolute', top: 0, left: 0, overflow: 'hidden', transformOrigin: '100% 50%' },
  info: { marginTop: 20, paddingHorizontal: 20, paddingVertical: 14 },
  caption: { gap: 2 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 12 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotActive: { transform: [{ scale: 1.35 }] },
});

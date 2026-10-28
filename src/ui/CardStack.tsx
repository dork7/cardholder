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
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';
import { categoryLabel } from '../cards/categories';
import { displayName } from '../cards/display';
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
import { Panel } from './Surface';
import { Text } from './Text';
import { TYPE, useTheme } from './theme';
import { useTooltip } from './Tooltip';

const EASING = Easing.bezier(0.2, 0.8, 0.2, 1);
const DURATION = 380;
// Slightly under-damped so the card settles with a small, physical overshoot after turning over.
const FLIP_SPRING = { stiffness: 180, damping: 20, mass: 1 };
const FLIP_BUTTON = 44;

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
  const flip = useSharedValue(0); // 0 = front face up, 1 = back face up, on the card at flipIndex
  const flipIndex = useSharedValue(active);
  const [flipped, setFlipped] = useState(false);

  const cardsRef = useRef(cards);
  cardsRef.current = cards;

  useEffect(() => {
    if (busy.value) return;
    from.value = active;
    steps.value = 0;
    f.value = 0;
  }, [active, n, busy, from, steps, f]);

  // A new card in front always starts face up.
  useEffect(() => {
    flip.value = 0;
    flipIndex.value = active;
    setFlipped(false);
  }, [active, flip, flipIndex]);

  const settle = (index: number) => {
    const card = cardsRef.current[index];
    if (card) setActiveId(card.id);
  };

  const duration = reduceMotion ? 0 : DURATION;

  // Retargets the spring from wherever it is, so tapping again mid-turn reverses it smoothly.
  const toggleFlip = () => {
    if (busy.value) return;
    const next = !flipped;
    setFlipped(next);
    flipIndex.value = active;
    flip.value = reduceMotion ? (next ? 1 : 0) : withSpring(next ? 1 : 0, FLIP_SPRING);
  };

  const unflip = () => {
    'worklet';
    if (flip.value !== 0) flip.value = withTiming(0, { duration, easing: EASING });
  };

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
    unflip();
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
    unflip();
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
    else if (e.nativeEvent.actionName === 'flip') toggleFlip();
  };

  // The flip button rides on the front card and fades out as soon as the stack starts to move.
  const flipButtonStyle = useAnimatedStyle(() => ({
    opacity: steps.value === 0 && pull.value === 0 ? 1 : Math.max(0, 1 - f.value * 4 - Math.abs(pull.value) / 20),
  }));

  const flipLabel = flipped ? strings.home.showFront : strings.home.showBack;
  const flipTip = useTooltip(flipLabel);

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
            accessibilityLabel={displayName(front)}
            accessibilityValue={{ text: strings.home.cardOf(active + 1, n) }}
            accessibilityHint={strings.home.stackHint}
            accessibilityActions={[
              { name: 'increment' },
              { name: 'decrement' },
              { name: 'activate' },
              ...(front.hasBack ? [{ name: 'flip', label: flipLabel }] : []),
            ]}
            onAccessibilityAction={onAccessibilityAction}
            testID="card-stack"
          >
            {cards.map((card, i) => (
              <StackCard
                key={card.id}
                card={card}
                index={i}
                n={n}
                inFront={i === active}
                geo={geo}
                motion={{ from, steps, f, pull, pullIndex, flip, flipIndex }}
              />
            ))}
          </View>
        </GestureDetector>
      )}

      {/* A sibling above the gesture area, so its taps never reach the stack's open/select tap. */}
      {width > 0 && front.hasBack && (
        <Animated.View
          style={[styles.flipButtonSlot, { left: geo.cardW - FLIP_BUTTON - 8 }, flipButtonStyle]}
          pointerEvents="box-none"
        >
          <Pressable
            ref={flipTip.ref}
            onPress={toggleFlip}
            onLongPress={flipTip.onLongPress}
            accessibilityRole="button"
            accessibilityLabel={flipLabel}
            testID="flip-card"
            style={({ pressed }) => [styles.flipButton, { opacity: pressed ? 0.7 : 1 }]}
          >
            <FlipIcon />
            {flipTip.tooltip}
          </Pressable>
        </Animated.View>
      )}

      <Panel style={styles.info}>
        <View style={styles.caption}>
          <Text style={{ fontSize: TYPE.section, fontWeight: '600', color: theme.text }} numberOfLines={1}>
            {displayName(front)}
          </Text>
          <Text style={{ fontSize: TYPE.secondary, color: theme.muted }}>{categoryLabel(front.category)}</Text>
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
                  { backgroundColor: i === active ? theme.text : theme.muted }, // `rosette` drops below 3:1 on a panel
                  i === active && styles.dotActive,
                ]}
              />
            ))}
          </View>
        )}
      </Panel>
    </View>
  );
}

interface Motion {
  from: SharedValue<number>;
  steps: SharedValue<number>;
  f: SharedValue<number>;
  pull: SharedValue<number>;
  pullIndex: SharedValue<number>;
  flip: SharedValue<number>;
  flipIndex: SharedValue<number>;
}

interface StackCardProps {
  card: Card;
  index: number;
  n: number;
  inFront: boolean;
  geo: StackGeometry;
  motion: Motion;
}

function StackCard({ card, index, n, inFront, geo, motion }: StackCardProps) {
  const theme = useTheme();
  const uri = useCardImage(card, 'thumb');
  // There is no back thumbnail; the full back image is only loaded for the card that can be flipped.
  const backUri = useCardImage(inFront && card.hasBack ? card : undefined, 'back');
  const { from, steps, f, pull, pullIndex, flip, flipIndex } = motion;
  const { fly } = geo;
  const radius = geo.cardW * ID1_RADIUS;

  const animated = useAnimatedStyle(() => {
    const pose = cardPose(index, n, from.value, steps.value, f.value, fly);
    const extra = index === pullIndex.value ? pull.value : 0;
    return {
      zIndex: pose.z,
      opacity: pose.opacity,
      transform: [{ translateX: pose.tx + extra }, { rotate: `${pose.rotate}deg` }, { scale: pose.scale }],
    };
  });

  // Each face turns on its own axis with its back hidden, so whichever side faces the viewer shows.
  // The card lifts toward the viewer at the half-way point and each face darkens as it turns away.
  const face = (offset: number) => () => {
    'worklet';
    const t = index === flipIndex.value ? flip.value : 0;
    const arc = Math.abs(Math.sin(t * Math.PI));
    return {
      transform: [{ perspective: 1200 }, { rotateY: `${t * 180 + offset}deg` }, { scale: 1 + 0.06 * arc }],
    };
  };
  const frontFace = useAnimatedStyle(face(0));
  const backFace = useAnimatedStyle(face(180));
  const shade = useAnimatedStyle(() => {
    const t = index === flipIndex.value ? flip.value : 0;
    return { opacity: 0.45 * Math.abs(Math.sin(t * Math.PI)) };
  });

  const faceStyle = [styles.face, { borderRadius: radius, backgroundColor: theme.surface }];
  return (
    <Animated.View pointerEvents="none" style={[styles.card, { width: geo.cardW, height: geo.cardH }, animated]}>
      <Animated.View style={[faceStyle, frontFace]}>
        {uri && <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />}
        {uri && <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.photoDim }]} />}
        <Animated.View style={[StyleSheet.absoluteFill, styles.shade, shade]} />
      </Animated.View>
      {card.hasBack && (
        <Animated.View style={[faceStyle, backFace]}>
          {backUri && <Image source={{ uri: backUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />}
          {backUri && <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.photoDim }]} />}
          <Animated.View style={[StyleSheet.absoluteFill, styles.shade, shade]} />
        </Animated.View>
      )}
    </Animated.View>
  );
}

// Two arrows chasing each other round: "turn this over". Drawn in white on a dark disc so it reads on
// any card photo. Paths from Lucide's refresh-cw (ISC).
function FlipIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <Path d="M21 3v5h-5" />
      <Path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <Path d="M8 16H3v5" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  // Scaling from the right edge keeps every peeking strip the same width.
  card: { position: 'absolute', top: 0, left: 0, transformOrigin: '100% 50%' },
  face: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', backfaceVisibility: 'hidden' },
  shade: { backgroundColor: '#000000' },
  flipButtonSlot: { position: 'absolute', top: 8, width: FLIP_BUTTON, height: FLIP_BUTTON, zIndex: 1000 },
  flipButton: {
    width: FLIP_BUTTON,
    height: FLIP_BUTTON,
    borderRadius: FLIP_BUTTON / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  info: { marginTop: 20, paddingHorizontal: 20, paddingVertical: 14 },
  caption: { gap: 2 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 12 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotActive: { transform: [{ scale: 1.35 }] },
});

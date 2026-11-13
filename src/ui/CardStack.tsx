import { useEffect, useRef, useState } from 'react';
import { AccessibilityActionEvent, LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
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
import { displayName } from '../cards/display';
import { expiryLabel, needsExpiryAlert } from '../cards/expiry';
import { Card } from '../cards/types';
import { useCardImage } from '../hooks/useCardImage';
import { strings } from '../strings';
import { ExpiryAlert } from './ExpiryAlert';
import {
  cardPose,
  dragProgress,
  CARD_RADIUS,
  mod,
  releaseAction,
  releaseVelocity,
  rubberBand,
  slotAt,
  stackGeometry,
  StackGeometry,
  TAP_SLOP,
} from './stackGeometry';
import { Panel } from './Surface';
import { Text } from './Text';
import { TYPE, useTheme } from './theme';
import { useTooltip } from './Tooltip';
import { CardPicture } from './CardPicture';
import { RetroIcon } from './RetroIcon';

const EASING = Easing.bezier(0.2, 0.8, 0.2, 1);
const DURATION = 380;
// After a swipe the stack finishes on a spring that starts at the finger's speed, so a flick keeps
// its momentum and a slow drag eases home instead of being snatched. Clamped: progress past the end
// would pose the cards wrongly.
const SETTLE = { duration: 420, dampingRatio: 1, overshootClamping: true };
// The front card pulled right and let go returns with a little give.
const SNAP_BACK = { duration: 400, dampingRatio: 0.8 };
// Slightly under-damped so the card settles with a small, physical overshoot after turning over.
const FLIP_SPRING = { stiffness: 180, damping: 20, mass: 1 };
const FLIP_BUTTON = 44;

interface Props {
  cards: Card[];
  onOpen: (card: Card) => void;
  vertical?: boolean; // swipe up and down, the pile fanned out below (a setting)
  // Given, the front card carries a button that blurs or clears that document's previews.
  onToggleBlur?: (card: Card) => void;
}

// Wallet-style stack: the front card is fully visible, the cards behind it fan out to its right,
// swiping left sends the front card to the back, swiping right brings the previous one back,
// and tapping a strip brings that card straight to the front.
export function CardStack({ cards, onOpen, vertical = false, onToggleBlur }: Props) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const n = cards.length;
  const active = Math.max(0, cards.findIndex((c) => c.id === activeId));
  const geo = stackGeometry(width, n, vertical);

  // The stack's motion is a single progress value: `from` is the front card, `steps` how far the
  // stack is moving, `f` how far along it is. Every card's pose is derived from those three.
  const from = useSharedValue(active);
  const steps = useSharedValue(0);
  const f = useSharedValue(0);
  const pull = useSharedValue(0); // rightward drag on the front card
  const pullIndex = useSharedValue(active); // the card that rightward drag belongs to
  const busy = useSharedValue(false);
  const dragging = useSharedValue(false);
  const dragStart = useSharedValue(0); // where the finger was when the drag took over, so the card doesn't jump by the slop
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
  // Progress (f) toward `to`, starting at `velocity` in progress per second.
  const settleF = (to: number, velocity: number, done?: (finished?: boolean) => void) => {
    'worklet';
    return reduceMotion ? withTiming(to, { duration: 0 }, done) : withSpring(to, { ...SETTLE, velocity }, done);
  };
  const settlePull = (velocity: number) => {
    'worklet';
    return reduceMotion ? withTiming(0, { duration: 0 }) : withSpring(0, { ...SNAP_BACK, velocity });
  };

  // Move the stack `count` cards forward from wherever the progress is now; `velocity` carries a flick on.
  const advance = (count: number, velocity = 0) => {
    'worklet';
    if (n < 2 || count <= 0) return;
    busy.value = true;
    unflip();
    steps.value = count;
    pull.value = settlePull(0);
    const to = mod(from.value + count, n);
    f.value = settleF(1, velocity, (done) => {
      if (done) finish(to);
    });
  };

  const goBack = (pullVelocity = 0) => {
    'worklet';
    if (n < 2) return;
    busy.value = true;
    unflip();
    const to = mod(from.value - 1, n);
    from.value = to;
    steps.value = 1;
    f.value = 1;
    pull.value = settlePull(pullVelocity);
    f.value = settleF(0, 0, (done) => {
      if (done) finish(to);
    });
  };

  const springBack = (velocity = 0, pullVelocity = 0) => {
    'worklet';
    pull.value = settlePull(pullVelocity);
    f.value = settleF(0, velocity, () => {
      steps.value = 0;
      busy.value = false;
    });
  };

  const select = (index: number) => {
    'worklet';
    if (busy.value || index === from.value) return;
    advance(mod(index - from.value, n));
  };

  const tapAt = (x: number, y: number) => {
    const k = slotAt(x, y, geo);
    if (k === 0) {
      const card = cardsRef.current[active];
      if (card) onOpen(card);
    } else {
      select(mod(active + k, n));
    }
  };

  // Movement along the stack's axis: x sideways, y vertically. Read in worklets from the gesture event.
  const along = (e: { translationX: number; translationY: number }) => {
    'worklet';
    return vertical ? e.translationY : e.translationX;
  };
  const speedAlong = (e: { velocityX: number; velocityY: number }) => {
    'worklet';
    return vertical ? e.velocityY : e.velocityX;
  };

  const pan = usePanGesture({
    enabled: n > 1,
    // A move mostly across the stack's axis is not a swipe.
    activeOffsetX: vertical ? undefined : [-TAP_SLOP, TAP_SLOP],
    failOffsetY: vertical ? undefined : [-20, 20],
    activeOffsetY: vertical ? [-TAP_SLOP, TAP_SLOP] : undefined,
    failOffsetX: vertical ? [-20, 20] : undefined,
    onActivate: (e) => {
      'worklet';
      dragging.value = !busy.value;
      if (!dragging.value) return;
      busy.value = true;
      pullIndex.value = from.value;
      dragStart.value = along(e);
    },
    onUpdate: (e) => {
      'worklet';
      if (!dragging.value) return;
      const dx = along(e) - dragStart.value;
      if (dx < 0) {
        steps.value = 1;
        f.value = dragProgress(dx, geo.fly);
        pull.value = 0;
      } else {
        f.value = 0;
        pull.value = rubberBand(dx) * 0.5;
      }
    },
    onDeactivate: (e) => {
      'worklet';
      if (!dragging.value) return;
      dragging.value = false;
      const dx = along(e) - dragStart.value;
      const vx = speedAlong(e);
      const action = e.canceled ? 0 : releaseAction(dx, vx);
      // The finger's speed in the units each value moves in: progress for a leftward swipe, points
      // (halved, as the pull is) for a rightward one.
      const fVelocity = releaseVelocity(vx, geo.fly);
      const pullVelocity = dx > 0 ? vx * 0.5 : 0;
      if (action === 1) advance(1, fVelocity);
      else if (action === -1) goBack(pullVelocity);
      else springBack(dx < 0 ? fVelocity : 0, pullVelocity);
    },
  });

  const tap = useTapGesture({
    runOnJS: true,
    maxDistance: TAP_SLOP,
    onActivate: (e) => {
      if (!busy.value) tapAt(e.x, e.y);
    },
  });

  const gesture = useCompetingGestures(pan, tap);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'increment') select(mod(active + 1, n));
    else if (e.nativeEvent.actionName === 'decrement' && !busy.value) goBack();
    else if (e.nativeEvent.actionName === 'activate') tapAt(0, 0);
    else if (e.nativeEvent.actionName === 'flip') toggleFlip();
    else if (e.nativeEvent.actionName === 'blur' && cards[active]) onToggleBlur?.(cards[active]);
  };

  // The flip button rides on the front card and fades out as soon as the stack starts to move.
  const flipButtonStyle = useAnimatedStyle(() => ({
    opacity: steps.value === 0 && pull.value === 0 ? 1 : Math.max(0, 1 - f.value * 4 - Math.abs(pull.value) / 20),
  }));

  const flipLabel = flipped ? strings.home.showFront : strings.home.showBack;
  const flipTip = useTooltip(flipLabel);

  const front = cards[active];
  const blurLabel = front?.blurPreview ? strings.home.clearPreview : strings.home.blurPreview;
  const blurTip = useTooltip(blurLabel);
  if (!front) return null;

  return (
    <View onLayout={onLayout} testID="card-stack-frame">
      {width > 0 && (
        <GestureDetector gesture={gesture}>
          <View
            style={{ height: geo.height }}
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel={
              needsExpiryAlert(front, new Date()) ? `${displayName(front)}, ${expiryLabel(front, new Date())}` : displayName(front)
            }
            accessibilityValue={{ text: strings.home.cardOf(active + 1, n) }}
            accessibilityHint={vertical ? strings.home.stackHintVertical : strings.home.stackHint}
            accessibilityActions={[
              { name: 'increment' },
              { name: 'decrement' },
              { name: 'activate' },
              ...(front.hasBack ? [{ name: 'flip', label: flipLabel }] : []),
              ...(onToggleBlur ? [{ name: 'blur', label: blurLabel }] : []),
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

      {/* Blur sits in the top right corner too, left of the flip button when the card has a back. */}
      {width > 0 && onToggleBlur && (
        <Animated.View
          style={[styles.flipButtonSlot, { left: geo.cardW - (front.hasBack ? 2 : 1) * (FLIP_BUTTON + 8) }, flipButtonStyle]}
          pointerEvents="box-none"
        >
          <Pressable
            ref={blurTip.ref}
            onPress={() => onToggleBlur(front)}
            onLongPress={blurTip.onLongPress}
            accessibilityRole="button"
            accessibilityLabel={blurLabel}
            testID="blur-card"
            // Amber while the previews are blurred, so the button shows which way it is set.
            style={({ pressed }) => [styles.flipButton, front.blurPreview && { backgroundColor: theme.accent }, { opacity: pressed ? 0.7 : 1 }]}
          >
            <RetroIcon name="blur" size={24} color={front.blurPreview ? theme.onAccent : '#FFFFFF'} backgroundColor={front.blurPreview ? theme.accent : '#1A1A1A'} />
            {blurTip.tooltip}
          </Pressable>
        </Animated.View>
      )}

      <Panel style={styles.info}>
        <View style={styles.caption}>
          <Text style={{ fontSize: TYPE.section, fontWeight: '600', color: theme.text }} numberOfLines={1}>
            {displayName(front)}
          </Text>
          <Text style={{ fontSize: TYPE.secondary, color: theme.muted }} numberOfLines={1}>
            {front.tags.join(' · ')}
          </Text>
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
  // The card in front is shown at full size, so it swaps to the full picture once that has loaded
  // (cards saved before thumbnails were made larger look soft otherwise); the ones behind keep the thumbnail.
  // The full picture is laid over the thumbnail rather than replacing it, so neither the swap nor
  // dropping it again when the card leaves the front makes the picture blink.
  const thumbUri = useCardImage(card, 'thumb');
  const fullUri = useCardImage(inFront ? card : undefined, 'front');
  const uri = fullUri ?? thumbUri;
  // There is no back thumbnail; the full back image is only loaded for the card that can be flipped.
  const backUri = useCardImage(inFront && card.hasBack ? card : undefined, 'back');
  const { from, steps, f, pull, pullIndex, flip, flipIndex } = motion;
  const { fly, vertical } = geo;
  const radius = geo.cardW * CARD_RADIUS;
  const alert = needsExpiryAlert(card, new Date());

  const animated = useAnimatedStyle(() => {
    const pose = cardPose(index, n, from.value, steps.value, f.value, fly);
    const extra = index === pullIndex.value ? pull.value : 0;
    return {
      zIndex: pose.z,
      opacity: pose.opacity,
      transform: [
        vertical ? { translateY: pose.tx + extra } : { translateX: pose.tx + extra },
        { rotate: `${pose.rotate}deg` },
        { scale: pose.scale },
      ],
    };
  });

  // Each face turns on its own axis with its back hidden, so whichever side faces the viewer shows.
  // The card lifts toward the viewer at the half-way point and each face fades toward the page as it turns away.
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

  const faceStyle = [styles.face, { borderRadius: radius, backgroundColor: theme.bg }];
  const shadeStyle = [StyleSheet.absoluteFill, { borderRadius: radius, backgroundColor: theme.bg }, shade];
  return (
    <Animated.View pointerEvents="none" style={[styles.card, vertical && styles.cardVertical, { width: geo.cardW, height: geo.cardH }, animated]}>
      <Animated.View style={[faceStyle, frontFace]}>
        <CardPicture uri={thumbUri} sharpUri={fullUri} vertical={card.vertical} blurPreview={card.blurPreview} radius={radius} />
        {uri && <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.photoDim, borderRadius: radius }]} />}
        {/* Top left: the flip button has the top right. */}
        {alert && (
          <View style={styles.alert}>
            <ExpiryAlert size={28} pop testID={`expiry-alert-${card.id}`} />
          </View>
        )}
        <Animated.View style={shadeStyle} />
      </Animated.View>
      {card.hasBack && (
        <Animated.View style={[faceStyle, backFace]}>
          <CardPicture uri={backUri} vertical={card.vertical} blurPreview={card.blurPreview} radius={radius} />
          {backUri && <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.photoDim, borderRadius: radius }]} />}
          <Animated.View style={shadeStyle} />
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
  // Scaling from the bottom edge keeps every strip below the same height.
  cardVertical: { transformOrigin: '50% 100%' },
  face: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', backfaceVisibility: 'hidden' },
  alert: { position: 'absolute', top: 12, left: 12 },
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

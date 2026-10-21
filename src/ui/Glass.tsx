import { BlurTargetView, BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { ComponentRef, createContext, ReactNode, RefObject, useContext, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, StyleProp, StyleSheet, useColorScheme, View, ViewStyle } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from './theme';

// Frosted glass for the home screen. Glass only reads as glass over something busy, so a GlassScene
// paints soft colour blobs behind its children, and every GlassPanel inside it frosts that backdrop.
// iOS 26+ gets the system Liquid Glass material; older iOS and Android get a blur plus a translucent
// fill, a rim that is brighter on top, and a soft shadow. Reduce Transparency swaps panels for solid ones.

type Target = RefObject<ComponentRef<typeof View> | null> | null;
const SceneTarget = createContext<Target>(null);

// The native module is missing until the dev client is rebuilt, so a failed check counts as "no".
const liquid = (() => {
  try {
    return Platform.OS === 'ios' && isLiquidGlassAvailable();
  } catch {
    return false;
  }
})();
// Android blurs a target view rather than whatever is behind; below API 31 it can't blur at all.
const androidBlur = Platform.OS === 'android' && Number(Platform.Version) >= 31;

export function useReduceTransparency(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceTransparencyEnabled()
      .then((on) => live && setReduce(on))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setReduce);
    return () => {
      live = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

export function GlassScene({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const target = useRef<ComponentRef<typeof View>>(null);
  const [a, b, c] = theme.aurora;
  return (
    <View style={[styles.scene, { backgroundColor: theme.bg }, style]}>
      <BlurTargetView ref={target} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height="100%" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Defs>
            <Blob id="a" color={a} />
            <Blob id="b" color={b} />
            <Blob id="c" color={c} />
          </Defs>
          <Rect x="-30%" y="-10%" width="110%" height="60%" fill="url(#a)" />
          <Rect x="35%" y="20%" width="90%" height="55%" fill="url(#b)" />
          <Rect x="-20%" y="55%" width="100%" height="55%" fill="url(#c)" />
        </Svg>
      </BlurTargetView>
      <SceneTarget.Provider value={target}>{children}</SceneTarget.Provider>
    </View>
  );
}

function Blob({ id, color }: { id: string; color: string }) {
  return (
    <RadialGradient id={id} cx="50%" cy="50%" r="50%">
      <Stop offset="0" stopColor={color} stopOpacity={0.75} />
      <Stop offset="0.55" stopColor={color} stopOpacity={0.3} />
      <Stop offset="1" stopColor={color} stopOpacity={0} />
    </RadialGradient>
  );
}

interface PanelProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  testID?: string;
}

export function GlassPanel({ children, style, radius = 20, testID }: PanelProps) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const target = useContext(SceneTarget);
  const reduce = useReduceTransparency();
  const shape = { borderRadius: radius };

  if (reduce) {
    return (
      <View testID={testID} style={[shape, { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }, style]}>
        {children}
      </View>
    );
  }

  if (liquid) {
    return (
      <GlassView testID={testID} glassEffectStyle="regular" colorScheme={scheme === 'dark' ? 'dark' : 'light'} style={[shape, style]}>
        {children}
      </GlassView>
    );
  }

  const blurs = Platform.OS === 'ios' || androidBlur;
  return (
    <View
      testID={testID}
      style={[
        shape,
        {
          // Float, then round the surface: lit top edge, shaded bottom edge.
          boxShadow: [
            { offsetX: 0, offsetY: 8, blurRadius: 32, color: theme.glassShade },
            { offsetX: 0, offsetY: 1, blurRadius: 0, color: theme.glassEdgeLit, inset: true },
            { offsetX: 0, offsetY: -1, blurRadius: 0, color: theme.glassShade, inset: true },
          ],
        },
        style,
      ]}
    >
      {blurs && (
        <BlurView
          intensity={40}
          tint={scheme === 'dark' ? 'systemUltraThinMaterialDark' : 'systemUltraThinMaterialLight'}
          blurTarget={target ?? undefined}
          blurMethod="dimezisBlurViewSdk31Plus"
          style={[StyleSheet.absoluteFill, shape, styles.clip]}
        />
      )}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          shape,
          {
            backgroundColor: blurs ? theme.glassFill : theme.glassFillNoBlur,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: theme.glassEdge,
            borderTopColor: theme.glassEdgeLit,
          },
        ]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  scene: { flex: 1, overflow: 'hidden' },
  clip: { overflow: 'hidden' },
});

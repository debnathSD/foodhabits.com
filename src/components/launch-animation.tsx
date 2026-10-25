import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  type SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { Type } from '@/constants/theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const INK = '#07120D';
const RICE = '#EAF2EC';
const SEED = '#D4F25C';
/** The drawing takes 1.8 s, holds 300 ms, then cross-fades to the app. */
const DRAW = 1800;
const HOLD = 300;
const FADE = 400;

const SEEDS: [number, number][] = [
  [50, 32],
  [32, 50],
  [50, 50],
  [68, 50],
  [32, 68],
];
/** The three seeds inside the pod pulse once at the end. */
const POD_SEEDS = new Set([1, 2, 3]);

function progress(time: number, start: number, length: number) {
  'worklet';
  return Math.min(1, Math.max(0, (time - start) / length));
}

function easeInOutCubic(t: number) {
  'worklet';
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutBack(t: number) {
  'worklet';
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

/** One seed: scales in on its turn (ease-out-back), and pod seeds pulse once. */
function Seed({ index, time }: { index: number; time: SharedValue<number> }) {
  const [cx, cy] = SEEDS[index];
  const animatedProps = useAnimatedProps(() => {
    const grow = easeOutBack(progress(time.value, index * 70, 260));
    const pulse = POD_SEEDS.has(index) && time.value > 1450 && time.value < 1700 ? 0.9 * Math.sin((Math.PI * (time.value - 1450)) / 250) : 0;
    return { r: Math.max(0, 2.6 * grow + pulse) };
  });
  return <AnimatedCircle cx={cx} cy={cy} fill={SEED} animatedProps={animatedProps} />;
}

/**
 * A line drawing itself between `start` and `start + duration` ms. `size` is
 * the path's length in viewBox units. Hidden at 0, so round caps leave no dot.
 */
function Line({ d, size, start, duration, time }: { d: string; size: number; start: number; duration: number; time: SharedValue<number> }) {
  const animatedProps = useAnimatedProps(() => {
    const drawn = easeInOutCubic(progress(time.value, start, duration));
    return { strokeDashoffset: size * (1 - drawn), strokeOpacity: drawn > 0 ? 1 : 0 };
  });
  return <AnimatedPath d={d} strokeDasharray={`${size} ${size}`} animatedProps={animatedProps} />;
}

/**
 * The launch: the Kolam f draws itself on ink as the native splash (which
 * shows the finished mark) hides, then cross-fades to the app. With reduced
 * motion it shows the final frame only.
 */
export function LaunchAnimation({ onDone }: { onDone: () => void }) {
  const time = useSharedValue(0);
  const fade = useSharedValue(1);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled) return;
        const finish = () => {
          fade.value = withDelay(reduce ? 500 : HOLD, withTiming(0, { duration: FADE }, (done) => done && runOnJS(onDone)()));
        };
        if (reduce) {
          time.value = DRAW;
          finish();
        } else {
          time.value = withTiming(DRAW, { duration: DRAW, easing: Easing.linear }, (done) => done && runOnJS(finish)());
        }
      });
    return () => {
      cancelled = true;
    };
  }, [time, fade, onDone]);

  const containerStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const wordmarkStyle = useAnimatedStyle(() => {
    const shown = progress(time.value, 1300, 500);
    return { opacity: shown, transform: [{ translateY: 8 * (1 - shown) }] };
  });

  return (
    <Animated.View style={[styles.container, containerStyle]} pointerEvents="none">
      <View style={styles.lockup}>
        <Svg width={132} height={132} viewBox="0 0 100 100">
          <G fill="none" stroke={RICE} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
            <Line d="M59 33V32A9 9 0 0 0 41 32V68A9 9 0 0 1 23 68V64" size={98} start={380} duration={720} time={time} />
            <Line d="M16 50A62.8 62.8 0 0 1 84 50A50.96 50.96 0 0 1 16 50Z" size={147} start={900} duration={600} time={time} />
          </G>
          {SEEDS.map((_, index) => (
            <Seed key={index} index={index} time={time} />
          ))}
        </Svg>
        <Animated.View style={wordmarkStyle}>
          <Text style={styles.wordmark}>
            foodhabits<Text style={styles.dot}>.</Text>
            <Text style={styles.tld}>com</Text>
          </Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: INK,
  },
  lockup: {
    alignItems: 'center',
    gap: 22,
  },
  wordmark: {
    fontFamily: Type.serif,
    fontSize: 34,
    color: RICE,
  },
  dot: {
    color: SEED,
  },
  tld: {
    opacity: 0.6,
  },
});

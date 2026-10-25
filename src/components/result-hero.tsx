import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Type, verdictColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Verdict } from '@/lib/verdict';
import { SceneCanvas } from '@/three/canvas';
import { ScoreOrb } from '@/three/scenes';
import { Studio } from '@/three/studio';

/**
 * The top of a result: the meal photo (or a 3D score orb when there is no
 * photo) under a dark fade, with the dish name, verdict and score set large.
 */
export function ResultHero({
  name,
  caption,
  verdictLabel,
  verdict,
  score,
  photo,
}: {
  name: string;
  caption: string;
  verdictLabel: string;
  verdict: Verdict;
  score: number;
  photo: string | null;
  /** Used by the web layout only. */
  wide?: boolean;
}) {
  const theme = useTheme();
  // The hero is always dark, so it uses the dark theme's verdict colours.
  const onDark = verdictColors(verdict, Colors.dark).color;

  return (
    <View style={styles.hero}>
      {photo ? (
        <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <>
          <LinearGradient colors={['#155C38', theme.hero]} style={StyleSheet.absoluteFill} />
          <SceneCanvas camera={[0, 0, 6.5]} style={styles.orb}>
            <Studio />
            <ScoreOrb score={score} color={onDark} />
          </SceneCanvas>
        </>
      )}
      <LinearGradient
        colors={['rgba(7,18,13,0)', 'rgba(7,18,13,0.55)', 'rgba(7,18,13,0.95)']}
        locations={[0.3, 0.62, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.copy}>
        <ThemedText type="caption" style={styles.caption}>
          {caption}
        </ThemedText>
        <ThemedText type="largeTitle" style={styles.name}>
          {name}
        </ThemedText>
        <View style={styles.scoreRow}>
          <View style={[styles.pill, { backgroundColor: onDark }]}>
            <ThemedText type="smallBold" style={styles.pillText}>
              {verdictLabel}
            </ThemedText>
          </View>
          <View style={styles.score} accessibilityLabel={`${score}/10`}>
            <ThemedText style={[styles.scoreValue, { color: onDark }]}>{score}</ThemedText>
            <ThemedText type="smallBold" style={styles.scoreOutOf}>
              /10
            </ThemedText>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    height: 400,
    marginHorizontal: -Spacing.four,
    marginTop: -Spacing.four,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  orb: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 110,
  },
  copy: {
    padding: Spacing.four,
    gap: Spacing.two,
  },
  caption: {
    color: 'rgba(238,245,239,0.7)',
  },
  name: {
    color: '#F3F7F2',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.one,
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two - 2,
  },
  pillText: {
    color: '#07120D',
  },
  score: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    // "7/10" reads left to right in every language.
    direction: 'ltr',
  },
  scoreValue: {
    fontFamily: Type.serif,
    fontSize: 64,
    lineHeight: 64,
  },
  scoreOutOf: {
    color: 'rgba(238,245,239,0.7)',
  },
});

import { Canvas } from '@react-three/fiber';
import { Image } from 'expo-image';
import { Suspense } from 'react';
import { StyleSheet, View } from 'react-native';
import * as THREE from 'three';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Type, verdictColors } from '@/constants/theme';
import type { Verdict } from '@/lib/verdict';
import { ScoreOrb } from '@/three/scenes';
import { Backdrop, FOREST } from '@/three/web/backdrop';
import { Effects } from '@/three/web/effects';
import { StudioLighting } from '@/three/web/lighting';

/**
 * Web: the top of a result. A meal photo, or the score as a glowing 3D orb in
 * a lit studio, with the dish name, verdict and score set large. On wide
 * screens it is a tall card beside the details.
 */
export function ResultHero({
  name,
  caption,
  verdictLabel,
  verdict,
  score,
  photo,
  wide = false,
}: {
  name: string;
  caption: string;
  verdictLabel: string;
  verdict: Verdict;
  score: number;
  photo: string | null;
  wide?: boolean;
}) {
  const onDark = verdictColors(verdict, Colors.dark).color;
  return (
    <View style={[styles.hero, wide ? styles.wide : styles.narrow]}>
      {photo ? (
        <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [0, 0.2, wide ? 10.5 : 9.6], fov: 32 }}
          gl={{ antialias: false, alpha: false, toneMapping: THREE.NoToneMapping }}
          style={StyleSheet.absoluteFill}>
          <Backdrop layers={FOREST} />
          <Suspense fallback={null}>
            <StudioLighting />
            <group position={[0, wide ? 1.2 : 1.1, 0]} scale={0.9}>
              <ScoreOrb score={score} color={onDark} />
            </group>
            <Effects bloom={0.7} />
          </Suspense>
        </Canvas>
      )}
      <View style={styles.shade} pointerEvents="none" />
      <View style={styles.copy} pointerEvents="none">
        <ThemedText type="caption" style={styles.caption}>
          {caption}
        </ThemedText>
        <ThemedText type={wide ? 'display' : 'largeTitle'} style={styles.name}>
          {name}
        </ThemedText>
        <View style={styles.scoreRow}>
          <View style={[styles.pill, { backgroundColor: onDark, boxShadow: `0 0 32px ${onDark}66` }]}>
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
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: '#06100b',
  },
  narrow: {
    height: 440,
    marginHorizontal: -Spacing.four,
    marginTop: -Spacing.four,
  },
  wide: {
    height: '100%',
    minHeight: 560,
    borderRadius: 32,
    boxShadow: '0 40px 80px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.08)',
  },
  shade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
    backgroundImage: 'linear-gradient(180deg, rgba(6,16,11,0) 0%, rgba(6,16,11,0.6) 45%, rgba(6,16,11,0.95) 100%)',
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
  },
  scoreValue: {
    fontFamily: Type.serif,
    fontSize: 72,
    lineHeight: 72,
  },
  scoreOutOf: {
    color: 'rgba(238,245,239,0.7)',
  },
});

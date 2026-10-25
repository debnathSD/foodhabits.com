import { Canvas, useFrame } from '@react-three/fiber';
import { Suspense, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import * as THREE from 'three';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { SaladBowl } from '@/three/scenes';
import type { ScanName } from '@/three/web/assets';
import { Backdrop, FOREST } from '@/three/web/backdrop';
import { Effects } from '@/three/web/effects';
import { StudioLighting } from '@/three/web/lighting';
import { Plinth } from '@/three/web/plinth';
import { Scan } from '@/three/web/scan';

const FOOD: { name: ScanName; position: [number, number, number]; size: number; spin: number }[] = [
  { name: 'food_pomegranate_01', position: [1.75, 0.95, -0.6], size: 0.62, spin: 0.22 },
  { name: 'food_avocado_01', position: [-1.85, 0.55, -0.3], size: 0.7, spin: -0.18 },
  { name: 'food_lime_01', position: [1.35, -0.15, 0.9], size: 0.42, spin: 0.3 },
  { name: 'food_kiwi_01', position: [-1.2, 1.45, -1.2], size: 0.44, spin: -0.25 },
  { name: 'food_ginger_01', position: [0.35, 1.75, -1.5], size: 0.5, spin: 0.2 },
  { name: 'food_apple_01', position: [-1.45, -0.35, 0.95], size: 0.46, spin: -0.22 },
];

const easeOut = (t: number) => 1 - Math.pow(1 - THREE.MathUtils.clamp(t, 0, 1), 3);

/** The bowl on its plinth with produce drifting around it; the camera eases in and follows the pointer. */
function Stage() {
  const pieces = useRef<(THREE.Group | null)[]>([]);
  const bowl = useRef<THREE.Group>(null);
  const look = useMemo(() => new THREE.Vector3(0, -0.15, 0), []);
  useFrame(({ clock, pointer, camera, size }, delta) => {
    const time = clock.getElapsedTime();
    const arrive = easeOut((time - 0.2) / 1.8);
    // Portrait cards need the camera further back, and the produce gathered in.
    const aspect = size.width / size.height;
    const fit = Math.min(1, aspect / 1.25);
    camera.position.x = THREE.MathUtils.damp(camera.position.x, pointer.x * 0.6, 2.5, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, 1.5 + pointer.y * 0.35, 2.5, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, 7 / Math.max(0.62, fit) + (1 - arrive) * 1.6, 3, delta);
    camera.lookAt(look);
    if (bowl.current) bowl.current.position.y = -0.55 - (1 - arrive) * 0.8;
    pieces.current.forEach((piece, index) => {
      if (!piece) return;
      const { position, spin } = FOOD[index];
      const out = (1 + (1 - arrive) * 1.5) * (0.75 + 0.25 * fit);
      piece.position.set(position[0] * out, position[1] + Math.sin(time * 0.7 + index * 1.7) * 0.1, position[2]);
      piece.rotation.set(Math.sin(time * 0.3 + index) * 0.3, time * spin + index, Math.sin(time * 0.4 + index) * 0.2);
    });
  });
  return (
    <>
      <group ref={bowl}>
        <group position={[0, 0.42, 0]} rotation={[0.12, 0, 0]}>
          <SaladBowl spin={0.18} />
        </group>
        <Plinth radius={1.35} height={0.32} />
      </group>
      {FOOD.map(({ name, size }, index) => (
        <group
          key={name}
          ref={(node) => {
            pieces.current[index] = node;
          }}>
          <Scan name={name} size={size} />
        </group>
      ))}
    </>
  );
}

/** Web: the home screen's 3D stage, with the day's greeting set over it. */
export function HomeHero({ greeting, title, wide = false }: { greeting: string; title: string; wide?: boolean }) {
  return (
    <View style={[styles.hero, wide ? styles.wide : styles.narrow]}>
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 1.5, 8], fov: 32 }}
        gl={{ antialias: false, alpha: false, toneMapping: THREE.NoToneMapping }}
        style={StyleSheet.absoluteFill}>
        <Backdrop layers={FOREST} />
        <Suspense fallback={null}>
          <StudioLighting />
          <Stage />
          <Effects bloom={0.4} />
        </Suspense>
      </Canvas>
      <View style={styles.shade} pointerEvents="none" />
      <View style={styles.copy} pointerEvents="none">
        <ThemedText type="smallBold" style={styles.greeting}>
          {greeting}
        </ThemedText>
        <ThemedText type={wide ? 'display' : 'largeTitle'} style={styles.title}>
          {title}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    overflow: 'hidden',
    backgroundColor: '#06100b',
  },
  narrow: {
    height: 480,
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
    height: '45%',
    backgroundImage: 'linear-gradient(180deg, rgba(6,16,11,0) 0%, rgba(6,16,11,0.85) 100%)',
  },
  copy: {
    position: 'absolute',
    left: Spacing.four,
    right: Spacing.four,
    bottom: Spacing.four,
    gap: Spacing.one,
  },
  greeting: {
    color: '#D4F25C',
  },
  title: {
    color: '#F3F7F2',
  },
});

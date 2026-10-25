import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { SceneCanvas } from '@/three/canvas';
import { FoodOrbit, SaladBowl } from '@/three/scenes';
import { Studio } from '@/three/studio';

/** The home screen's opening: a live 3D bowl on a deep emerald glow, with the day's greeting. */
export function HomeHero({ greeting, title }: { greeting: string; title: string; wide?: boolean }) {
  const theme = useTheme();
  return (
    <View style={styles.hero}>
      <LinearGradient
        colors={['#155C38', theme.hero, theme.background]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SceneCanvas camera={[0, 2.6, 5.6]} style={styles.canvas}>
        <Studio />
        <group position={[0.15, -0.35, 0]} rotation={[0.18, 0, 0]}>
          <SaladBowl spin={0.25} />
        </group>
        <group position={[0.15, 0.55, 0]}>
          <FoodOrbit count={6} radius={2.05} speed={0.14} tilt={0.42} />
        </group>
      </SceneCanvas>
      <View style={styles.copy} pointerEvents="none">
        <ThemedText type="smallBold" style={styles.greeting}>
          {greeting}
        </ThemedText>
        <ThemedText type="largeTitle" style={styles.title}>
          {title}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    height: 420,
    marginHorizontal: -Spacing.four,
    marginTop: -Spacing.four,
    overflow: 'hidden',
  },
  canvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 70,
  },
  copy: {
    position: 'absolute',
    left: Spacing.four,
    right: Spacing.four,
    bottom: Spacing.three,
    gap: Spacing.one,
  },
  greeting: {
    color: '#D4F25C',
  },
  title: {
    color: '#F3F7F2',
  },
});

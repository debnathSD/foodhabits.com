import { LinearGradient } from 'expo-linear-gradient';
import { Platform, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** The home screen's opening: the day's greeting on a deep emerald glow. A plain gradient, so it costs a phone nothing. */
export function HomeHero({ greeting, title, wide = false }: { greeting: string; title: string; wide?: boolean }) {
  const theme = useTheme();
  return (
    <View style={[styles.hero, wide ? styles.wide : styles.narrow]}>
      <LinearGradient
        // On the web, screens sit on the page backdrop, so the glow fades into it.
        colors={['#155C38', theme.hero, wide ? '#06100B' : Platform.OS === 'web' ? 'rgba(11,42,27,0)' : theme.background]}
        locations={[0, 0.6, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.copy}>
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
    justifyContent: 'flex-end',
  },
  narrow: {
    height: 240,
    marginHorizontal: -Spacing.four,
    marginTop: -Spacing.four,
  },
  wide: {
    height: 380,
    borderRadius: 32,
  },
  copy: {
    padding: Spacing.four,
    gap: Spacing.one,
  },
  greeting: {
    color: '#D4F25C',
  },
  title: {
    color: '#F3F7F2',
  },
});

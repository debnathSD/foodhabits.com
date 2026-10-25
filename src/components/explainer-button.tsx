import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Opens the narrated explainer video. */
export function ExplainerButton({ title, hint, onPress }: { title: string; hint: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.button, { backgroundColor: theme.accent, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
      <View style={styles.playCircle}>
        <Icon name="play" size={22} color={theme.onAccent} />
      </View>
      <View style={styles.flex}>
        <ThemedText type="heading" style={{ color: theme.onAccent }}>
          {title}
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.onAccent, opacity: 0.75 }}>
          {hint}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: 28,
  },
  playCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(7,18,13,0.12)',
  },
  flex: {
    flex: 1,
  },
});

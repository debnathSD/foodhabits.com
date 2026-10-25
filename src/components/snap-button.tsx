import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** The main call to action: open the camera. */
export function SnapButton({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.snap, { backgroundColor: theme.accent, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
      <Icon name="camera" size={22} color={theme.onAccent} />
      <ThemedText type="heading" style={{ color: theme.onAccent }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  snap: {
    flex: 1,
    height: 60,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
});

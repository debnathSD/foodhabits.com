import { Pressable, StyleSheet } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { useTheme } from '@/hooks/use-theme';

/** A round icon button. */
export function IconButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { backgroundColor: theme.backgroundSelected, transform: [{ scale: pressed ? 0.96 : 1 }] }]}>
      <Icon name={icon} size={22} color={theme.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

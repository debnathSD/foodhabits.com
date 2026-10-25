import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Icon, type IconName } from './icon';

/** A titled section of a screen, with an optional leading icon. */
export function Section({
  title,
  icon,
  iconColor,
  children,
  note,
}: {
  title: string;
  icon?: IconName;
  iconColor?: string;
  note?: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        {icon && <Icon name={icon} size={18} color={iconColor ?? theme.tint} />}
        <ThemedText type="heading" accessibilityRole="header">
          {title}
        </ThemedText>
      </View>
      {note && (
        <ThemedText type="small" themeColor="textSecondary">
          {note}
        </ThemedText>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.three,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});

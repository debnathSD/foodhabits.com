import { StyleSheet, View, type ViewProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Elevation, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

import { Icon, type IconName } from './icon';

/** A raised surface: a light top edge in dark mode, a soft two-layer shadow in light mode. */
export function Card({ style, ...props }: ViewProps) {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.backgroundElement, borderColor: theme.highlight },
        !dark && Elevation,
        style,
      ]}
      {...props}
    />
  );
}

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
  card: {
    borderRadius: Radius.large,
    borderWidth: 1,
    padding: Spacing.three + 2,
    gap: Spacing.two + 2,
  },
  section: {
    gap: Spacing.three,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});

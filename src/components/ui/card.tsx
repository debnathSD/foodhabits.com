import { StyleSheet, View, type ViewProps } from 'react-native';

import { Elevation, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

export { Section } from './section';

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

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.large,
    borderWidth: 1,
    padding: Spacing.three + 2,
    gap: Spacing.two + 2,
  },
});

import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing, verdictColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Verdict } from '@/lib/verdict';

/** Ten-segment meter for the gut score. */
export function ScoreMeter({ score, verdict }: { score: number; verdict: Verdict }) {
  const theme = useTheme();
  const { color } = verdictColors(verdict, theme);
  return (
    <View style={styles.meter} accessibilityLabel={`${score}/10`}>
      {Array.from({ length: 10 }, (_, index) => (
        <View
          key={index}
          style={[styles.segment, { backgroundColor: index < score ? color : theme.backgroundSelected }]}
        />
      ))}
    </View>
  );
}

/** Compact score pill for lists. */
export function ScorePill({ score, verdict }: { score: number; verdict: Verdict }) {
  const theme = useTheme();
  const { color, soft } = verdictColors(verdict, theme);
  return (
    <View style={[styles.pill, { backgroundColor: soft }]}>
      <ThemedText type="smallBold" style={{ color }}>
        {score}/10
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  meter: {
    flexDirection: 'row',
    gap: 3,
  },
  segment: {
    flex: 1,
    height: 8,
    borderRadius: 4,
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.half,
  },
});

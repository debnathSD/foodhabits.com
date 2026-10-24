import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ScorePill } from '@/components/score-badge';
import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useAnalysis } from '@/hooks/use-analysis';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/use-translation';
import { formatTime } from '@/lib/format';
import { photoUri } from '@/lib/photo-store';
import type { Scan } from '@/lib/store';

export function MealRow({ scan }: { scan: Scan }) {
  const theme = useTheme();
  const { t, language } = useTranslation();
  const result = useAnalysis(scan);
  if (!result) return null;
  const uri = photoUri(scan.photo);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/result/[id]', params: { id: scan.id } })}
      style={({ pressed }) => [styles.row, { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.8 : 1 }]}>
      {uri ? (
        <Image source={{ uri }} style={styles.thumb} contentFit="cover" />
      ) : (
        <View style={[styles.thumb, styles.placeholder, { backgroundColor: theme.backgroundSelected }]}>
          <Icon name="fork" size={22} color={theme.textSecondary} />
        </View>
      )}
      <View style={styles.text}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {result.name}
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {formatTime(scan.createdAt, language)} · {t(`verdict.${result.analysis.verdict}`)}
        </ThemedText>
      </View>
      <ScorePill score={result.analysis.score} verdict={result.analysis.verdict} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.two,
    paddingRight: Spacing.three,
    borderRadius: Radius.medium,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: Radius.small,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
});

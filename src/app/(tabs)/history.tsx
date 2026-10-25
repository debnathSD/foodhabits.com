import { SectionList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MealRow } from '@/components/meal-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Icon } from '@/components/ui/icon';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useWebLayout } from '@/hooks/use-web-layout';
import { useTranslation } from '@/i18n/use-translation';
import { dayLabel, startOfDay } from '@/lib/format';
import { type Scan, useAppState } from '@/lib/store';

export default function HistoryScreen() {
  const layout = useWebLayout();
  const theme = useTheme();
  const { t, language } = useTranslation();
  const scans = useAppState((state) => state.scans);

  const sections: { title: string; data: Scan[] }[] = [];
  for (const scan of scans) {
    const title = dayLabel(startOfDay(scan.createdAt), language, { today: t('common.today'), yesterday: t('common.yesterday') });
    const last = sections[sections.length - 1];
    if (last?.title === title) last.data.push(scan);
    else sections.push({ title, data: [scan] });
  }

  return (
    <ThemedView style={[styles.container, layout.screen]}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <SectionList
          sections={sections}
          keyExtractor={(scan) => scan.id}
          contentContainerStyle={[styles.content, { paddingTop: layout.topInset || undefined }]}
          contentInsetAdjustmentBehavior="automatic"
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={<ThemedText type="largeTitle">{t('history.title')}</ThemedText>}
          renderSectionHeader={({ section }) => (
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionHeader}>
              {section.title}
            </ThemedText>
          )}
          renderItem={({ item }) => <MealRow scan={item} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="history" size={40} color={theme.textSecondary} />
              <ThemedText type="subtitle" themeColor="textSecondary" style={styles.emptyText}>
                {t('history.empty')}
              </ThemedText>
            </View>
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safe: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  content: {
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.five,
  },
  sectionHeader: {
    marginTop: Spacing.four,
    marginBottom: Spacing.two,
  },
  separator: {
    height: Spacing.two,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.six,
  },
  emptyText: {
    textAlign: 'center',
  },
});

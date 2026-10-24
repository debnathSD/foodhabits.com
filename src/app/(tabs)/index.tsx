import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HomeHero } from '@/components/home-hero';
import { MealRow } from '@/components/meal-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card, Section } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAnalysis } from '@/hooks/use-analysis';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/use-translation';
import { analyzeFood } from '@/lib/engine';
import { resolveFood } from '@/lib/food-index';
import { greetingKey, isToday } from '@/lib/format';
import { type Scan, useAppState } from '@/lib/store';

const UP_NEXT_WINDOW = 10 * 60 * 60 * 1000;

export default function HomeScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const scans = useAppState((state) => state.scans);
  const now = useNow();
  const todays = scans.filter((scan) => isToday(scan.createdAt, now));
  const latest = scans[0];
  const showUpNext = latest && now - latest.createdAt < UP_NEXT_WINDOW;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
          <HomeHero greeting={t(greetingKey())} title={t('home.prompt')} />

          <View style={styles.ctaRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/scan')}
              style={({ pressed }) => [styles.snap, { backgroundColor: theme.accent, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
              <Icon name="camera" size={22} color={theme.onAccent} />
              <ThemedText type="heading" style={{ color: theme.onAccent }}>
                {t('home.snap')}
              </ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('home.typeInstead')}
              onPress={() => router.push('/search')}
              style={({ pressed }) => [
                styles.searchButton,
                { backgroundColor: theme.backgroundSelected, transform: [{ scale: pressed ? 0.96 : 1 }] },
              ]}>
              <Icon name="search" size={22} color={theme.text} />
            </Pressable>
          </View>

          {showUpNext && <UpNext scan={latest} />}

          {todays.length > 0 ? (
            <Section title={t('home.todayMeals')} icon="fork">
              <DayScore scans={todays} />
              {todays.map((scan) => (
                <MealRow key={scan.id} scan={scan} />
              ))}
            </Section>
          ) : (
            <Section title={t('home.howItWorks')} icon="sparkle">
              <Card>
                {(['home.step1', 'home.step2', 'home.step3'] as const).map((key, index) => (
                  <View key={key} style={styles.step}>
                    <View style={[styles.stepNumber, { backgroundColor: theme.goodSoft }]}>
                      <ThemedText type="smallBold" themeColor="tint">
                        {index + 1}
                      </ThemedText>
                    </View>
                    <ThemedText type="small" style={styles.flex}>
                      {t(key)}
                    </ThemedText>
                  </View>
                ))}
              </Card>
            </Section>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function UpNext({ scan }: { scan: Scan }) {
  const theme = useTheme();
  const { t, list } = useTranslation();
  const result = useAnalysis(scan);
  if (!result) return null;
  const { analysis } = result;
  const avoid = analysis.avoid.slice(0, 3).map((item) => t(`avoid.${item.id}.food`));
  const eat = analysis.eat.filter((id) => id !== 'more_of_this').slice(0, 2).map((id) => t(`eat.${id}.food`));

  return (
    <Section title={t('home.upNext')} icon="next">
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push({ pathname: '/result/[id]', params: { id: scan.id } })}>
        <Card>
          <ThemedText type="smallBold">{t('home.afterMeal', { dish: result.name })}</ThemedText>
          <View style={styles.upNextRow}>
            <Icon name="avoid" size={16} color={theme.bad} />
            <ThemedText type="small" style={styles.flex}>
              <ThemedText type="smallBold" themeColor="bad">
                {t('home.avoid')}:{' '}
              </ThemedText>
              {list(avoid)}
            </ThemedText>
          </View>
          <View style={styles.upNextRow}>
            <Icon name="good" size={16} color={theme.good} />
            <ThemedText type="small" style={styles.flex}>
              <ThemedText type="smallBold" themeColor="good">
                {t('home.eat')}:{' '}
              </ThemedText>
              {list(eat)}
            </ThemedText>
          </View>
        </Card>
      </Pressable>
    </Section>
  );
}

function DayScore({ scans }: { scans: Scan[] }) {
  const { t } = useTranslation();
  const profile = useAppState((state) => state.profile);
  const scores = scans
    .map((scan) => {
      const food = resolveFood(scan.food);
      return food ? analyzeFood(food, { profile, hour: new Date(scan.createdAt).getHours() }).score : null;
    })
    .filter((score): score is number => score !== null);
  if (!scores.length) return null;
  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  return (
    <ThemedText type="small" themeColor="textSecondary">
      {t('home.dayScore', { score: average.toFixed(1) })}
    </ThemedText>
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
    gap: Spacing.four,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: -Spacing.two,
  },
  snap: {
    flex: 1,
    height: 60,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  searchButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upNextRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'flex-start',
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: {
    flex: 1,
  },
});

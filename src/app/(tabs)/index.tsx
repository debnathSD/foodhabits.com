import { router } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HomeHero } from '@/components/home-hero';
import { IconButton } from '@/components/icon-button';
import { MealRow } from '@/components/meal-row';
import { SnapButton } from '@/components/snap-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card, Section } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { BottomTabInset, MaxContentWidth, Spacing, verdictColors } from '@/constants/theme';
import { useAnalysis } from '@/hooks/use-analysis';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/use-translation';
import { analyzeFood } from '@/lib/engine';
import { resolveFood } from '@/lib/food-index';
import { greetingKey, isToday } from '@/lib/format';
import { type Scan, useAppState } from '@/lib/store';
import { verdictForScore } from '@/lib/verdict';

const UP_NEXT_WINDOW = 10 * 60 * 60 * 1000;

/** Web windows at least this wide get the two-column dashboard. */
const WIDE = 900;

export default function HomeScreen() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const wide = Platform.OS === 'web' && width >= WIDE;
  const scans = useAppState((state) => state.scans);
  const now = useNow();
  const todays = scans.filter((scan) => isToday(scan.createdAt, now));
  const latest = scans[0];
  const showUpNext = latest && now - latest.createdAt < UP_NEXT_WINDOW;

  const hero = <HomeHero greeting={t(greetingKey())} title={t('home.prompt')} wide={wide} />;
  const actions = (
    <View style={styles.ctaRow}>
      <SnapButton label={t('home.snap')} onPress={() => router.push('/scan')} />
      <IconButton icon="search" label={t('home.typeInstead')} onPress={() => router.push('/search')} />
    </View>
  );

  return (
    <ThemedView style={[styles.container, Platform.OS === 'web' && styles.clear]}>
      <SafeAreaView style={[styles.safe, wide && styles.safeWide]} edges={['top']}>
        <ScrollView
          contentContainerStyle={[styles.content, wide && styles.contentWide]}
          contentInsetAdjustmentBehavior="automatic">
          {wide ? (
            <View style={styles.columns}>
              <View style={styles.heroColumn}>{hero}</View>
              <View style={styles.sideColumn}>
                {showUpNext && <UpNext scan={latest} />}
                <TodayOrHowTo todays={todays} />
              </View>
            </View>
          ) : (
            <>
              {hero}
              {actions}
              {showUpNext && <UpNext scan={latest} />}
              <TodayOrHowTo todays={todays} />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function TodayOrHowTo({ todays }: { todays: Scan[] }) {
  const theme = useTheme();
  const { t } = useTranslation();
  return todays.length > 0 ? (
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
  );
}

function UpNext({ scan }: { scan: Scan }) {
  const theme = useTheme();
  const { t, list } = useTranslation();
  const result = useAnalysis(scan);
  if (!result) return null;
  const { analysis } = result;
  const avoid = analysis.avoid.slice(0, 3).map((item) => t(`avoid.${item.id}.food`));
  const eat = analysis.eat
    .filter((id) => id !== 'more_of_this')
    .slice(0, 2)
    .map((id) => t(`eat.${id}.food`));

  return (
    <Section title={t('home.upNext')} icon="next">
      <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/result/[id]', params: { id: scan.id } })}>
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
  const theme = useTheme();
  const profile = useAppState((state) => state.profile);
  const scores = scans
    .map((scan) => {
      const food = resolveFood(scan.food);
      return food ? analyzeFood(food, { profile, hour: new Date(scan.createdAt).getHours() }).score : null;
    })
    .filter((score): score is number => score !== null);
  if (!scores.length) return null;
  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const color = verdictColors(verdictForScore(Math.round(average)), theme).color;
  return (
    <Card style={styles.dayScore}>
      <View style={styles.flex}>
        <ThemedText type="smallBold">{t('home.dayAverage')}</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {t('home.dayScore', { score: average.toFixed(1) })}
        </ThemedText>
      </View>
      <ThemedText type="display" style={{ color }}>
        {average.toFixed(1)}
      </ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  clear: {
    backgroundColor: 'transparent',
  },
  safe: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  safeWide: {
    maxWidth: 1212,
  },
  contentWide: {
    paddingTop: 104,
    paddingBottom: Spacing.five,
  },
  columns: {
    flexDirection: 'row',
    gap: Spacing.five,
    alignItems: 'flex-start',
  },
  // On wide screens the greeting stays in view while the day's cards scroll past.
  heroColumn: {
    flex: 1.15,
    position: 'sticky',
    top: 104,
  } as unknown as ViewStyle,
  sideColumn: {
    flex: 1,
    gap: Spacing.four,
    paddingTop: Spacing.two,
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
  upNextRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'flex-start',
  },
  dayScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
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

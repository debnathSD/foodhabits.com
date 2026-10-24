import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ResultHero } from '@/components/result-hero';
import { ScoreMeter } from '@/components/score-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card, Section } from '@/components/ui/card';
import { Chip, ChipGroup } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { CONTACT_EMAIL } from '@/constants/app';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAnalysis } from '@/hooks/use-analysis';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/use-translation';
import { confirmDestructive } from '@/lib/confirm';
import { summaryText, watchText } from '@/lib/describe';
import type { Effect } from '@/lib/engine';
import { foodFromLabel } from '@/lib/food-index';
import { goBack } from '@/lib/navigation';
import { photoUri } from '@/lib/photo-store';
import { deleteScan, updateScan, useAppState } from '@/lib/store';

export default function ResultScreen() {
  const theme = useTheme();
  const { t, tValue, list, capitalize } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const scan = useAppState((state) => state.scans.find((candidate) => candidate.id === id));
  const result = useAnalysis(scan);
  const [changing, setChanging] = useState(false);

  if (!scan || !result) {
    return (
      <ThemedView style={[styles.container, styles.missing]}>
        <ThemedText themeColor="textSecondary">{t('result.missing')}</ThemedText>
        <Button title={t('common.back')} variant="secondary" onPress={() => goBack()} />
      </ThemedView>
    );
  }

  const { analysis, name } = result;
  const uri = photoUri(scan.photo);
  const unsure = scan.source === 'photo' && (scan.confidence ?? 1) < 0.6;
  const alternatives = (scan.alternatives ?? []).map(foodFromLabel).filter((food) => food !== null);
  const swaps = tValue<{ swap: string; why: string }[]>(`swaps.${analysis.swaps}`) ?? [];

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ResultHero
          name={name}
          caption={scan.source === 'photo' ? t('result.sourceModel') : t('result.sourceSearch')}
          verdictLabel={t(`verdict.${analysis.verdict}`)}
          verdict={analysis.verdict}
          score={analysis.score}
          photo={uri}
        />

        <Card>
          <ScoreMeter score={analysis.score} verdict={analysis.verdict} />
          <ThemedText>{summaryText(analysis, t, list, capitalize)}</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            {t('result.perServing', { min: analysis.nutrition.kcal[0], max: analysis.nutrition.kcal[1] })}
          </ThemedText>
        </Card>

        {(unsure || changing) && (
          <Card>
            {unsure && !changing && (
              <View style={styles.row}>
                <Icon name="warning" size={18} color={theme.warn} />
                <ThemedText type="small" style={styles.flex}>
                  {t('result.confidenceLow')}
                </ThemedText>
              </View>
            )}
            <ChipGroup>
              {alternatives.map((food) => (
                <Chip
                  key={food.name}
                  label={food.name}
                  selected={false}
                  onPress={() => {
                    updateScan(scan.id, {
                      food: food.ref,
                      confidence: undefined,
                      alternatives: (scan.alternatives ?? [])
                        .filter((index) => index !== (food.ref.kind === 'label' ? food.ref.index : -1))
                        .concat(scan.food.kind === 'label' ? [scan.food.index] : []),
                    });
                    setChanging(false);
                  }}
                />
              ))}
            </ChipGroup>
            <Button
              title={t('scan.noneOfThese')}
              icon="search"
              variant="secondary"
              onPress={() => router.push({ pathname: '/search', params: { replace: scan.id } })}
            />
          </Card>
        )}
        {!changing && (
          <Button title={t('result.fixIt')} icon="edit" variant="ghost" onPress={() => setChanging(true)} />
        )}

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/explainer/[id]', params: { id: scan.id } })}
          style={({ pressed }) => [styles.explainer, { backgroundColor: theme.accent, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
          <View style={styles.playCircle}>
            <Icon name="play" size={22} color={theme.onAccent} />
          </View>
          <View style={styles.flex}>
            <ThemedText type="heading" style={{ color: theme.onAccent }}>
              {t('result.explain')}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.onAccent, opacity: 0.75 }}>
              {t('result.explainHint')}
            </ThemedText>
          </View>
        </Pressable>

        <Section title={t('result.gutTitle')} icon="leaf">
          <Card>
            {analysis.gut.map((item) => (
              <EffectRow key={item.id} effect={item.effect} title={t(`gut.${item.id}.title`)} detail={t(`gut.${item.id}.detail`)} />
            ))}
          </Card>
        </Section>

        {analysis.body.length > 0 && (
          <Section title={t('result.bodyTitle')} icon="heart">
            <Card>
              {analysis.body.map((item) => (
                <EffectRow key={item.id} effect={item.effect} title={t(`body.${item.id}.title`)} detail={t(`body.${item.id}.detail`)} />
              ))}
            </Card>
          </Section>
        )}

        {analysis.risks.length > 0 && (
          <Section title={t('result.risksTitle')} icon="risk" iconColor={theme.bad} note={t('result.risksNote')}>
            <Card style={{ backgroundColor: theme.badSoft }}>
              {analysis.risks.map((risk) => (
                <View key={risk} style={styles.effect}>
                  <Icon name="risk" size={18} color={theme.bad} />
                  <View style={styles.flex}>
                    <ThemedText type="smallBold">{t(`risks.${risk}.name`)}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {t(`risks.${risk}.detail`)}
                    </ThemedText>
                  </View>
                </View>
              ))}
            </Card>
          </Section>
        )}

        <Section title={t('result.avoidTitle')} icon="avoid" iconColor={theme.bad}>
          {analysis.avoid.map((item) => (
            <Card key={item.id}>
              <View style={styles.scoreRow}>
                <ThemedText type="smallBold" themeColor="bad" style={styles.flex}>
                  {t(`avoid.${item.id}.food`)}
                </ThemedText>
                <View style={[styles.tag, { backgroundColor: theme.backgroundSelected }]}>
                  <ThemedText type="caption">{t(`timeframe.${item.timeframe}`)}</ThemedText>
                </View>
              </View>
              <LabeledLine label={t('result.gutReason')} text={t(`avoid.${item.id}.gut`)} />
              <LabeledLine label={t('result.bodyReason')} text={t(`avoid.${item.id}.body`)} />
              <View style={[styles.instead, { backgroundColor: theme.goodSoft }]}>
                <Icon name="next" size={16} color={theme.good} />
                <ThemedText type="small" style={styles.flex}>
                  <ThemedText type="smallBold" themeColor="good">
                    {t('result.instead')}:{' '}
                  </ThemedText>
                  {t(`instead.${item.instead}`)}
                </ThemedText>
              </View>
            </Card>
          ))}
        </Section>

        <Section title={t('result.eatTitle')} icon="good" iconColor={theme.good}>
          <Card>
            {analysis.eat.map((id) => (
              <EffectRow key={id} effect="good" title={t(`eat.${id}.food`)} detail={t(`eat.${id}.why`)} />
            ))}
          </Card>
        </Section>

        {swaps.length > 0 && (
          <Section title={t('result.swapsTitle')} icon="swap">
            <Card>
              {swaps.map((swap) => (
                <View key={swap.swap} style={styles.effect}>
                  <Icon name="swap" size={18} color={theme.tint} />
                  <View style={styles.flex}>
                    <ThemedText type="smallBold">{swap.swap}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {swap.why}
                    </ThemedText>
                  </View>
                </View>
              ))}
            </Card>
          </Section>
        )}

        {analysis.watch.length > 0 && (
          <Section title={t('result.watchTitle')} icon="warning" iconColor={theme.warn}>
            <Card style={{ backgroundColor: theme.warnSoft }}>
              {analysis.watch.map((item, index) => (
                <View key={index} style={styles.row}>
                  <Icon name="warning" size={16} color={theme.warn} />
                  <ThemedText type="small" style={styles.flex}>
                    {watchText(item, t, list)}
                  </ThemedText>
                </View>
              ))}
            </Card>
          </Section>
        )}

        <Section title={t('result.nutritionTitle')} icon="fork">
          <View style={styles.nutrition}>
            {(['fiber', 'protein', 'sugar', 'satFat', 'sodium'] as const).map((key) => {
              const level = analysis.nutrition[key];
              const goodWhenHigh = key === 'fiber' || key === 'protein';
              const tone = level === 'medium' ? theme.warn : (level === 'high') === goodWhenHigh ? theme.good : theme.bad;
              return (
                <View key={key} style={[styles.nutrient, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText type="caption" themeColor="textSecondary">
                    {t(`nutrients.${key}`)}
                  </ThemedText>
                  <ThemedText type="smallBold" style={{ color: tone }}>
                    {t(`levels.${level}`)}
                  </ThemedText>
                </View>
              );
            })}
          </View>
        </Section>

        <ThemedText type="caption" themeColor="textSecondary">
          {t('result.disclaimer')}
        </ThemedText>
        <View style={styles.actions}>
          <Button
            title={t('result.report')}
            icon="flag"
            variant="secondary"
            onPress={() =>
              Linking.openURL(
                `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`foodhabits.com: problem with "${name}"`)}&body=${encodeURIComponent(
                  `Dish: ${name}\nResult id: ${scan.id}\n\nWhat looks wrong?\n`,
                )}`,
              ).catch(() => {})
            }
          />
          <Button
            title={t('result.deleteScan')}
            icon="trash"
            variant="danger"
            onPress={() =>
              confirmDestructive({
                message: t('result.deleteConfirm'),
                action: t('common.delete'),
                cancel: t('common.cancel'),
                onConfirm: () => {
                  deleteScan(scan.id);
                  goBack();
                },
              })
            }
          />
        </View>
      </ScrollView>
    </ThemedView>
  );
}

function EffectRow({ effect, title, detail }: { effect: Effect; title: string; detail: string }) {
  const theme = useTheme();
  const color = effect === 'good' ? theme.good : effect === 'bad' ? theme.bad : theme.warn;
  return (
    <View style={styles.effect}>
      <Icon name={effect} size={18} color={color} />
      <View style={styles.flex}>
        <ThemedText type="smallBold">{title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {detail}
        </ThemedText>
      </View>
    </View>
  );
}

function LabeledLine({ label, text }: { label: string; text: string }) {
  return (
    <ThemedText type="small">
      <ThemedText type="smallBold">{label}: </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {text}
      </ThemedText>
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  missing: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.four,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
  explainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Radius.large,
    padding: Spacing.three,
  },
  playCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(7,18,13,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  effect: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  tag: {
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  instead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    borderRadius: Radius.small,
    padding: Spacing.two,
  },
  nutrition: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  nutrient: {
    flexGrow: 1,
    flexBasis: '30%',
    borderRadius: Radius.small,
    padding: Spacing.two,
    gap: Spacing.half,
  },
  actions: {
    gap: Spacing.two,
  },
});

import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card, Section } from '@/components/ui/card';
import { Chip, ChipGroup } from '@/components/ui/chip';
import { Icon, type IconName } from '@/components/ui/icon';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { findLanguage } from '@/i18n/languages';
import { useTranslation } from '@/i18n/use-translation';
import { confirmDestructive } from '@/lib/confirm';
import { DIETS, GOALS, SENSITIVITIES } from '@/lib/profile-options';
import { clearScans, setVoice, updateProfile, useAppState } from '@/lib/store';

function toggle<T>(list: T[], item: T) {
  return list.includes(item) ? list.filter((value) => value !== item) : [...list, item];
}

export default function ProfileScreen() {
  const { t, language } = useTranslation();
  const profile = useAppState((state) => state.profile);
  const voice = useAppState((state) => state.voice);
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
          <View style={styles.header}>
            <ThemedText type="largeTitle">{t('profile.title')}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t('profile.subtitle')}
            </ThemedText>
          </View>

          <Section title={t('profile.diet')} icon="leaf">
            <ChipGroup>
              {DIETS.map((diet) => (
                <Chip
                  key={diet.id}
                  label={t(`profileOptions.diet.${diet.id}`)}
                  selected={profile.diet === diet.id}
                  onPress={() => updateProfile({ diet: diet.id })}
                />
              ))}
            </ChipGroup>
          </Section>

          <Section title={t('profile.sensitivities')} icon="warning">
            <ChipGroup>
              {SENSITIVITIES.map((option) => (
                <Chip
                  key={option.id}
                  label={t(`profileOptions.sensitivities.${option.id}`)}
                  selected={profile.sensitivities.includes(option.id)}
                  onPress={() => updateProfile({ sensitivities: toggle(profile.sensitivities, option.id) })}
                />
              ))}
            </ChipGroup>
          </Section>

          <Section title={t('profile.goals')} icon="heart">
            <ChipGroup>
              {GOALS.map((option) => (
                <Chip
                  key={option.id}
                  label={t(`profileOptions.goals.${option.id}`)}
                  selected={profile.goals.includes(option.id)}
                  onPress={() => updateProfile({ goals: toggle(profile.goals, option.id) })}
                />
              ))}
            </ChipGroup>
          </Section>

          <Card>
            <SettingRow icon="globe" label={t('profile.language')} value={findLanguage(language)?.name} onPress={() => router.push('/language')} />
            <View style={styles.settingRow}>
              <Icon name="speaker" size={20} color={theme.tint} />
              <View style={styles.flex}>
                <ThemedText type="smallBold">{t('profile.voice')}</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  {voice ? t('profile.voiceOn') : t('profile.voiceOff')}
                </ThemedText>
              </View>
              <Switch value={voice} onValueChange={setVoice} trackColor={{ true: theme.tint }} />
            </View>
          </Card>

          <Section title={t('profile.about')} icon="sparkle">
            <Card>
              <SettingRow icon="lock" label={t('profile.privacy')} onPress={() => router.push('/privacy')} />
              <ThemedText type="caption" themeColor="textSecondary">
                {t('profile.version', { version: Constants.expoConfig?.version ?? '1.0.0' })}
              </ThemedText>
            </Card>
          </Section>

          <Section title={t('profile.data')} icon="trash" iconColor={theme.bad}>
            <Card>
              <SettingRow
                icon="trash"
                label={t('profile.clearHistory')}
                danger
                onPress={() =>
                  confirmDestructive({
                    message: t('profile.clearConfirm'),
                    action: t('common.delete'),
                    cancel: t('common.cancel'),
                    onConfirm: clearScans,
                  })
                }
              />
            </Card>
          </Section>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function SettingRow({
  icon,
  label,
  value,
  onPress,
  danger,
}: {
  icon: IconName;
  label: string;
  value?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.settingRow, { opacity: pressed ? 0.7 : 1 }]}>
      <Icon name={icon} size={20} color={danger ? theme.bad : theme.tint} />
      <ThemedText type="smallBold" style={[styles.flex, danger && { color: theme.bad }]}>
        {label}
      </ThemedText>
      {value && (
        <ThemedText type="small" themeColor="textSecondary">
          {value}
        </ThemedText>
      )}
      <Icon name="chevron" size={16} color={theme.textSecondary} />
    </Pressable>
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
  header: {
    gap: Spacing.one,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  flex: {
    flex: 1,
  },
});

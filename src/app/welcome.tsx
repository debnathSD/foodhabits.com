import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LanguageList } from '@/components/language-list';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { translate } from '@/i18n';
import { useTranslation } from '@/i18n/use-translation';
import { completeOnboarding, setLanguage, useAppState } from '@/lib/store';

export default function WelcomeScreen() {
  const chosen = useAppState((state) => state.language);
  const [step, setStep] = useState<'language' | 'intro'>(chosen ? 'intro' : 'language');
  const [pending, setPending] = useState(chosen);
  const { t, language } = useTranslation();
  const theme = useTheme();

  if (step === 'language') {
    const shown = pending ?? language;
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <ScrollView contentContainerStyle={styles.content}>
            <Icon name="globe" size={36} color={theme.tint} />
            <ThemedText type="largeTitle">{translate(shown, 'onboarding.languageTitle')}</ThemedText>
            <ThemedText type="subtitle" themeColor="textSecondary">
              {translate(shown, 'onboarding.languageSubtitle')}
            </ThemedText>
            <LanguageList selected={pending} onSelect={(code) => setPending(code)} language={shown} />
          </ScrollView>
          <View style={styles.footer}>
            <Button
              title={translate(shown, 'common.continue')}
              disabled={!pending}
              onPress={() => {
                if (!pending) return;
                setLanguage(pending);
                setStep('intro');
              }}
            />
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Image source={require('@/assets/images/icon.png')} style={styles.logo} accessibilityIgnoresInvertColors />
          <View style={styles.titles}>
            <ThemedText type="largeTitle">{t('common.appName')}</ThemedText>
            <ThemedText type="subtitle" themeColor="textSecondary">
              {t('onboarding.tagline')}
            </ThemedText>
          </View>
          <View style={styles.features}>
            <Feature icon="camera" title={t('onboarding.feature1Title')} text={t('onboarding.feature1Text')} />
            <Feature icon="leaf" title={t('onboarding.feature2Title')} text={t('onboarding.feature2Text')} />
            <Feature icon="next" title={t('onboarding.feature3Title')} text={t('onboarding.feature3Text')} />
            <Feature icon="lock" title={t('onboarding.privacyTitle')} text={t('onboarding.privacyText')} />
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {t('onboarding.disclaimer')}{' '}
            <Link href="/privacy">
              <ThemedText type="small" themeColor="tint" style={styles.link}>
                {t('profile.privacy')}
              </ThemedText>
            </Link>
          </ThemedText>
        </ScrollView>
        <View style={styles.footer}>
          <Button title={t('onboarding.start')} onPress={completeOnboarding} />
          <Button title={t('profile.language')} icon="globe" variant="ghost" onPress={() => setStep('language')} />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

function Feature({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  const theme = useTheme();
  return (
    <View style={styles.feature}>
      <View style={[styles.featureIcon, { backgroundColor: theme.goodSoft }]}>
        <Icon name={icon} size={20} color={theme.tint} />
      </View>
      <View style={styles.featureText}>
        <ThemedText type="smallBold">{title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {text}
        </ThemedText>
      </View>
    </View>
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
    gap: Spacing.three,
  },
  logo: {
    width: 76,
    height: 76,
    borderRadius: 18,
  },
  titles: {
    gap: Spacing.one,
  },
  features: {
    gap: Spacing.three,
    marginVertical: Spacing.two,
  },
  feature: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'flex-start',
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    gap: Spacing.half,
  },
  link: {
    textDecorationLine: 'underline',
  },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    gap: Spacing.two,
  },
});

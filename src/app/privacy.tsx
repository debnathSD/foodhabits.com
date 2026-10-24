import { ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CONTACT_EMAIL } from '@/constants/app';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTranslation } from '@/i18n/use-translation';

/** Shown in the app and, on the web build, at /privacy for the store listings. */
export default function PrivacyScreen() {
  const { t, tValue } = useTranslation();
  const paragraphs = tValue<string[]>('privacy.body') ?? [];
  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title">{t('privacy.title')}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t('privacy.updated')}
        </ThemedText>
        {paragraphs.map((paragraph) => (
          <ThemedText key={paragraph}>{paragraph}</ThemedText>
        ))}
        <ThemedText>{t('privacy.contact', { email: CONTACT_EMAIL })}</ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
});

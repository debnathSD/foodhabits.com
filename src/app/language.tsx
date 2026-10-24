import { ScrollView, StyleSheet } from 'react-native';

import { LanguageList } from '@/components/language-list';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTranslation } from '@/i18n/use-translation';
import { goBack } from '@/lib/navigation';
import { setLanguage } from '@/lib/store';

export default function LanguageScreen() {
  const { language } = useTranslation();
  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <LanguageList
          selected={language}
          language={language}
          onSelect={(code) => {
            setLanguage(code);
            goBack();
          }}
        />
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
    padding: Spacing.three,
    paddingBottom: Spacing.six,
  },
});

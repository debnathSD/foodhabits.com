import { getLocales } from 'expo-localization';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { TRANSLATED, translate } from '@/i18n';
import { findLanguage, LANGUAGES, type LanguageCode } from '@/i18n/languages';

/** The phone's preferred languages that the app offers, most preferred first. */
function deviceLanguages(): LanguageCode[] {
  const codes = getLocales()
    .map((locale) => findLanguage(locale.languageCode)?.code)
    .filter((code): code is LanguageCode => Boolean(code));
  return [...new Set(codes)];
}

export function LanguageList({
  selected,
  onSelect,
  language,
}: {
  selected: LanguageCode | null;
  onSelect: (code: LanguageCode) => void;
  /** Language the headings are shown in. */
  language: LanguageCode;
}) {
  const suggested = deviceLanguages();
  const rest = LANGUAGES.filter((item) => !suggested.includes(item.code));

  return (
    <View style={styles.list}>
      {suggested.length > 0 && (
        <>
          <ThemedText type="smallBold" themeColor="textSecondary">
            {translate(language, 'onboarding.suggested')}
          </ThemedText>
          {suggested.map((code) => (
            <LanguageRow key={code} code={code} selected={selected === code} onPress={() => onSelect(code)} />
          ))}
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.heading}>
            {translate(language, 'onboarding.allLanguages')}
          </ThemedText>
        </>
      )}
      {rest.map((item) => (
        <LanguageRow key={item.code} code={item.code} selected={selected === item.code} onPress={() => onSelect(item.code)} />
      ))}
    </View>
  );
}

function LanguageRow({ code, selected, onPress }: { code: LanguageCode; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  const language = findLanguage(code)!;
  const partial = !TRANSLATED.includes(code);
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: selected ? theme.goodSoft : theme.backgroundElement,
          borderColor: selected ? theme.tint : 'transparent',
          opacity: pressed ? 0.8 : 1,
        },
      ]}>
      <View style={styles.names}>
        <ThemedText type="subtitle" style={styles.native}>
          {language.name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {language.english}
          {partial ? ' · English text for now' : ''}
        </ThemedText>
      </View>
      {selected && <Icon name="good" size={22} color={theme.tint} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two,
  },
  heading: {
    marginTop: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 2,
    paddingVertical: Spacing.two + 4,
    paddingHorizontal: Spacing.three,
  },
  names: {
    flex: 1,
  },
  native: {
    fontWeight: 600,
  },
});

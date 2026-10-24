import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Chip, ChipGroup } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useFoodName } from '@/hooks/use-analysis';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/use-translation';
import type { Food } from '@/lib/engine';
import { GENERIC_CHOICES, genericFood, searchFoods } from '@/lib/food-index';
import { haptics } from '@/lib/haptics';
import { logMeal } from '@/lib/log-meal';
import { goBack } from '@/lib/navigation';
import { updateScan } from '@/lib/store';

export default function SearchScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const foodName = useFoodName();
  /**
   * `photo`: the user came from a photo the model couldn't place.
   * `replace`: the user is correcting the dish of a meal already logged.
   */
  const { photo, replace } = useLocalSearchParams<{ photo?: string; replace?: string }>();
  const [query, setQuery] = useState('');
  const results = searchFoods(query);
  const showGeneric = query.trim().length > 1 && results.length === 0;

  function choose(food: Food) {
    haptics.success();
    if (replace) {
      updateScan(replace, { food: food.ref, confidence: undefined });
      goBack();
      return;
    }
    const id = logMeal({ food, photo: photo ?? null });
    router.replace({ pathname: '/result/[id]', params: { id } });
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.inner}>
        <View style={[styles.searchBox, { backgroundColor: theme.backgroundElement }]}>
          <Icon name="search" size={18} color={theme.textSecondary} />
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder={t('search.placeholder')}
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text }]}
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel={t('search.title')}
          />
        </View>

        {showGeneric ? (
          <View style={styles.generic}>
            <ThemedText themeColor="textSecondary">{t('search.noResults', { query: query.trim() })}</ThemedText>
            <ChipGroup>
              {GENERIC_CHOICES.map((category) => (
                <Chip
                  key={category}
                  label={t(`categories.${category}`)}
                  selected={false}
                  onPress={() => choose(genericFood(category))}
                />
              ))}
            </ChipGroup>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(food) => food.name}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                onPress={() => choose(item)}
                style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1, borderBottomColor: theme.border }]}>
                <View style={styles.flex}>
                  <ThemedText type="subtitle">{foodName(item)}</ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary">
                    {t(`categories.${item.category}`)}
                  </ThemedText>
                </View>
                <Icon name="chevron" size={16} color={theme.textSecondary} />
              </Pressable>
            )}
          />
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.three,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
  },
  input: {
    flex: 1,
    fontSize: 17,
    paddingVertical: Spacing.three,
    // The search box already shows focus; drop the browser's outline on web.
    ...Platform.select({ web: { outlineWidth: 0 } }),
  },
  list: {
    paddingBottom: Spacing.six,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  flex: {
    flex: 1,
  },
  generic: {
    gap: Spacing.three,
  },
});

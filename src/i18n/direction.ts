import { I18nManager, Platform } from 'react-native';

import type { LanguageCode } from './languages';

/**
 * Lays the app out right to left for Urdu and Arabic. On the web the page's
 * `dir` flips flex rows straight away; on phones `I18nManager` keeps the new
 * direction and it takes effect from the next launch.
 */
export function applyDirection(language: LanguageCode, rtl: boolean) {
  if (Platform.OS === 'web') {
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    return;
  }
  I18nManager.allowRTL(true);
  if (I18nManager.isRTL !== rtl) I18nManager.forceRTL(rtl);
}

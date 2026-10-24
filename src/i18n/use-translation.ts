import { useAppState } from '@/lib/store';

import { capitalize, joinList, type Params, translate, translateValue } from './index';
import { findLanguage } from './languages';

/** Translation helpers bound to the user's chosen language. Re-renders when it changes. */
export function useTranslation() {
  const language = useAppState((state) => state.language) ?? 'en';
  const info = findLanguage(language)!;
  return {
    language,
    speechLanguage: info.speech,
    rtl: 'rtl' in info && info.rtl,
    t: (key: string, params?: Params) => translate(language, key, params),
    tValue: <T,>(key: string) => translateValue<T>(language, key),
    list: (items: string[]) => joinList(language, items),
    capitalize,
  };
}

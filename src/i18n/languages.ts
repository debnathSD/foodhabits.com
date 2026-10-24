/**
 * Languages offered on first launch. `speech` is the BCP-47 tag handed to the
 * phone's text-to-speech engine for the explainer voice-over.
 */
export const LANGUAGES = [
  { code: 'en', name: 'English', english: 'English', speech: 'en-IN' },
  { code: 'hi', name: 'हिन्दी', english: 'Hindi', speech: 'hi-IN' },
  { code: 'bn', name: 'বাংলা', english: 'Bengali', speech: 'bn-IN' },
  { code: 'te', name: 'తెలుగు', english: 'Telugu', speech: 'te-IN' },
  { code: 'mr', name: 'मराठी', english: 'Marathi', speech: 'mr-IN' },
  { code: 'ta', name: 'தமிழ்', english: 'Tamil', speech: 'ta-IN' },
  { code: 'ur', name: 'اردو', english: 'Urdu', speech: 'ur-IN', rtl: true },
  { code: 'gu', name: 'ગુજરાતી', english: 'Gujarati', speech: 'gu-IN' },
  { code: 'kn', name: 'ಕನ್ನಡ', english: 'Kannada', speech: 'kn-IN' },
  { code: 'ml', name: 'മലയാളം', english: 'Malayalam', speech: 'ml-IN' },
  { code: 'or', name: 'ଓଡ଼ିଆ', english: 'Odia', speech: 'or-IN' },
  { code: 'pa', name: 'ਪੰਜਾਬੀ', english: 'Punjabi', speech: 'pa-IN' },
  { code: 'as', name: 'অসমীয়া', english: 'Assamese', speech: 'as-IN' },
  { code: 'es', name: 'Español', english: 'Spanish', speech: 'es-ES' },
  { code: 'fr', name: 'Français', english: 'French', speech: 'fr-FR' },
  { code: 'pt', name: 'Português', english: 'Portuguese', speech: 'pt-BR' },
  { code: 'de', name: 'Deutsch', english: 'German', speech: 'de-DE' },
  { code: 'ar', name: 'العربية', english: 'Arabic', speech: 'ar-SA', rtl: true },
  { code: 'zh', name: '中文', english: 'Chinese', speech: 'zh-CN' },
  { code: 'ja', name: '日本語', english: 'Japanese', speech: 'ja-JP' },
  { code: 'ru', name: 'Русский', english: 'Russian', speech: 'ru-RU' },
  { code: 'id', name: 'Bahasa Indonesia', english: 'Indonesian', speech: 'id-ID' },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

export function findLanguage(code: string | null | undefined) {
  return LANGUAGES.find((language) => language.code === code);
}

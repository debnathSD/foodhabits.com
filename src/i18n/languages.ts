/** Languages offered on first launch. */
export const LANGUAGES = [
  { code: 'en', name: 'English', english: 'English' },
  { code: 'hi', name: 'हिन्दी', english: 'Hindi' },
  { code: 'bn', name: 'বাংলা', english: 'Bengali' },
  { code: 'te', name: 'తెలుగు', english: 'Telugu' },
  { code: 'mr', name: 'मराठी', english: 'Marathi' },
  { code: 'ta', name: 'தமிழ்', english: 'Tamil' },
  { code: 'ur', name: 'اردو', english: 'Urdu', rtl: true },
  { code: 'gu', name: 'ગુજરાતી', english: 'Gujarati' },
  { code: 'kn', name: 'ಕನ್ನಡ', english: 'Kannada' },
  { code: 'ml', name: 'മലയാളം', english: 'Malayalam' },
  { code: 'or', name: 'ଓଡ଼ିଆ', english: 'Odia' },
  { code: 'pa', name: 'ਪੰਜਾਬੀ', english: 'Punjabi' },
  { code: 'as', name: 'অসমীয়া', english: 'Assamese' },
  { code: 'es', name: 'Español', english: 'Spanish' },
  { code: 'fr', name: 'Français', english: 'French' },
  { code: 'pt', name: 'Português', english: 'Portuguese' },
  { code: 'de', name: 'Deutsch', english: 'German' },
  { code: 'ar', name: 'العربية', english: 'Arabic', rtl: true },
  { code: 'zh', name: '中文', english: 'Chinese' },
  { code: 'ja', name: '日本語', english: 'Japanese' },
  { code: 'ru', name: 'Русский', english: 'Russian' },
  { code: 'id', name: 'Bahasa Indonesia', english: 'Indonesian' },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

export function findLanguage(code: string | null | undefined) {
  return LANGUAGES.find((language) => language.code === code);
}

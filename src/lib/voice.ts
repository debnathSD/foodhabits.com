/** A text-to-speech voice as expo-speech lists it. */
export type VoiceOption = { identifier: string; language: string };

const normal = (tag: string) => tag.replace('_', '-').toLowerCase();

/**
 * The voice to narrate in: one for the exact language and region (bn-IN) if
 * the phone or browser has it, otherwise any voice for the language. Naming
 * the voice matters: given only a language, some browsers read with their
 * default voice, which skips scripts it can't pronounce and stays silent.
 */
export function pickVoice(voices: VoiceOption[], language: string): string | null {
  const wanted = normal(language);
  const base = wanted.split('-')[0];
  const exact = voices.find((voice) => normal(voice.language) === wanted);
  const sameLanguage = voices.find((voice) => normal(voice.language).split('-')[0] === base);
  return (exact ?? sameLanguage)?.identifier ?? null;
}

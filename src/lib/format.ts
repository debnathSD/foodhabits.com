import type { LanguageCode } from '@/i18n/languages';

export function formatTime(timestamp: number, language: LanguageCode) {
  return new Date(timestamp).toLocaleTimeString(language, { hour: 'numeric', minute: '2-digit' });
}

export function startOfDay(timestamp: number) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function isToday(timestamp: number, now = Date.now()) {
  return startOfDay(timestamp) === startOfDay(now);
}

/** "Today", "Yesterday" or a localised date. */
export function dayLabel(timestamp: number, language: LanguageCode, labels: { today: string; yesterday: string }) {
  const day = startOfDay(timestamp);
  const today = startOfDay(Date.now());
  if (day === today) return labels.today;
  if (day === today - 86_400_000) return labels.yesterday;
  return new Date(timestamp).toLocaleDateString(language, { weekday: 'long', day: 'numeric', month: 'long' });
}

export function greetingKey(hour = new Date().getHours()) {
  if (hour < 12) return 'home.morning';
  if (hour < 17) return 'home.afternoon';
  return 'home.evening';
}

import { router } from 'expo-router';

/** Goes back, or home when the screen was opened directly (e.g. from a link). */
export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

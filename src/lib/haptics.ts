import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

function safely(run: () => Promise<void>) {
  if (Platform.OS === 'web') return;
  run().catch(() => {});
}

export const haptics = {
  tap: () => safely(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  success: () => safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};

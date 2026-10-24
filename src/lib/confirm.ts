import { Alert, Platform } from 'react-native';

/** A destructive confirmation. Alert.alert has no web implementation, so web uses confirm(). */
export function confirmDestructive({
  message,
  action,
  cancel,
  onConfirm,
}: {
  message: string;
  action: string;
  cancel: string;
  onConfirm: () => void;
}) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(message)) onConfirm();
    return;
  }
  Alert.alert(message, undefined, [
    { text: cancel, style: 'cancel' },
    { text: action, style: 'destructive', onPress: onConfirm },
  ]);
}

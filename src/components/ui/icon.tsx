import { SymbolView, type SymbolViewProps } from 'expo-symbols';

/** SF Symbols on iOS, Material Symbols on Android and web. */
const ICONS = {
  camera: { ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' },
  photos: { ios: 'photo.on.rectangle', android: 'photo_library', web: 'photo_library' },
  search: { ios: 'magnifyingglass', android: 'search', web: 'search' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  torchOn: { ios: 'flashlight.on.fill', android: 'flashlight_on', web: 'flashlight_on' },
  torchOff: { ios: 'flashlight.off.fill', android: 'flashlight_off', web: 'flashlight_off' },
  good: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
  bad: { ios: 'exclamationmark.circle.fill', android: 'error', web: 'error' },
  mixed: { ios: 'minus.circle.fill', android: 'do_not_disturb_on', web: 'do_not_disturb_on' },
  warning: { ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' },
  leaf: { ios: 'leaf.fill', android: 'eco', web: 'eco' },
  heart: { ios: 'heart.fill', android: 'favorite', web: 'favorite' },
  risk: { ios: 'cross.case.fill', android: 'medical_services', web: 'medical_services' },
  avoid: { ios: 'hand.raised.fill', android: 'block', web: 'block' },
  next: { ios: 'arrow.right.circle.fill', android: 'arrow_circle_right', web: 'arrow_circle_right' },
  swap: { ios: 'arrow.triangle.2.circlepath', android: 'sync_alt', web: 'sync_alt' },
  chevron: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  back: { ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' },
  play: { ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' },
  pause: { ios: 'pause.fill', android: 'pause', web: 'pause' },
  replay: { ios: 'arrow.counterclockwise', android: 'replay', web: 'replay' },
  speaker: { ios: 'speaker.wave.2.fill', android: 'volume_up', web: 'volume_up' },
  trash: { ios: 'trash', android: 'delete', web: 'delete' },
  flag: { ios: 'flag', android: 'flag', web: 'flag' },
  globe: { ios: 'globe', android: 'language', web: 'language' },
  history: { ios: 'clock.arrow.circlepath', android: 'history', web: 'history' },
  person: { ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' },
  lock: { ios: 'lock.fill', android: 'lock', web: 'lock' },
  sparkle: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' },
  edit: { ios: 'pencil', android: 'edit', web: 'edit' },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
  fork: { ios: 'fork.knife', android: 'restaurant', web: 'restaurant' },
} as const satisfies Record<string, SymbolViewProps['name']>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color: string }) {
  return <SymbolView name={ICONS[name]} size={size} tintColor={color} />;
}

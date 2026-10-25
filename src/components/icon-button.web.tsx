import { Icon, type IconName } from '@/components/ui/icon';

/** Web: a round glass icon button. */
export function IconButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <button type="button" className="fh-orb-button" aria-label={label} onClick={onPress}>
      <Icon name={icon} size={22} color="#EAF2EC" />
    </button>
  );
}

import { useRef } from 'react';

import { useTilt } from '@/hooks/use-tilt.web';

/** Web: the camera call to action as a 3D key that tilts to the pointer and presses down. */
export function SnapButton({ label, onPress }: { label: string; onPress: () => void }) {
  const key = useRef<HTMLButtonElement>(null);
  useTilt(key, 14);
  return (
    <button ref={key} type="button" className="fh-key" style={{ flex: 1 }} onClick={onPress}>
      <span className="fh-key__glow" aria-hidden="true" />
      <span className="fh-key__depth" aria-hidden="true" />
      <span className="fh-key__face" style={{ font: '600 18px/1 InterTight_600SemiBold, "Inter Tight", system-ui, sans-serif' }}>
        <span className="fh-key__shine" aria-hidden="true" />
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.6l1.4-2h5l1.4 2h1.6A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z" />
          <circle cx="12" cy="12.5" r="3.5" />
        </svg>
        {label}
      </span>
    </button>
  );
}

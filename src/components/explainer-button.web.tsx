import { useRef } from 'react';

import { useTilt } from '@/hooks/use-tilt.web';

/** Web: the explainer as a large 3D key, with a play disc and a two-line label. */
export function ExplainerButton({ title, hint, onPress }: { title: string; hint: string; onPress: () => void }) {
  const key = useRef<HTMLButtonElement>(null);
  useTilt(key, 8);
  return (
    <button ref={key} type="button" className="fh-key" style={{ minHeight: 84, width: '100%', ['--lift' as string]: '7px' }} onClick={onPress}>
      <span className="fh-key__glow" aria-hidden="true" />
      <span className="fh-key__depth" aria-hidden="true" style={{ borderRadius: 30 }} />
      <span className="fh-key__face" style={{ borderRadius: 30, justifyContent: 'flex-start', gap: 18, padding: '0 22px' }}>
        <span className="fh-key__shine" aria-hidden="true" />
        <span style={{ display: 'grid', placeItems: 'center', width: 52, height: 52, borderRadius: 26, background: '#07120D', color: '#D4F25C', flex: 'none' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
          </svg>
        </span>
        <span style={{ display: 'grid', gap: 4, textAlign: 'left' }}>
          <span style={{ font: '600 20px/1.1 InterTight_600SemiBold, "Inter Tight", system-ui, sans-serif' }}>{title}</span>
          <span style={{ font: '400 15px/1.2 InterTight_400Regular, "Inter Tight", system-ui, sans-serif', opacity: 0.75 }}>{hint}</span>
        </span>
      </span>
    </button>
  );
}

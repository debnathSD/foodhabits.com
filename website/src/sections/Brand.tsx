import { useEffect, useRef } from 'react';

import { APP_URL } from '../links';
import { playMarkDrawing } from '../motion';

const SEEDS: [number, number][] = [
  [50, 32],
  [32, 50],
  [50, 50],
  [68, 50],
  [32, 68],
];

/**
 * The Kolam f: one rice-flour line around five seeds on a 3x3 grid. `weight`
 * picks the master (large) or the heavier 48-64 px drawing; `tile` adds the
 * rounded ink tile.
 */
export function Mark({ size = 28, tile = true, weight = 'small' }: { size?: number; tile?: boolean; weight?: 'master' | 'small' }) {
  const stroke = weight === 'master' ? 4 : 5;
  const radius = weight === 'master' ? 2.6 : 3;
  return (
    <svg className="mark" width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      {tile && <rect width="100" height="100" rx="22" fill="#07120D" />}
      <g fill="none" stroke="#EAF2EC" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
        <path className="mark__f" pathLength={100} d="M59 33V32A9 9 0 0 0 41 32V68A9 9 0 0 1 23 68V64" />
        <path className="mark__pod" pathLength={100} d="M16 50A62.8 62.8 0 0 1 84 50A50.96 50.96 0 0 1 16 50Z" />
      </g>
      <g fill="#D4F25C">
        {SEEDS.map(([x, y]) => (
          <circle key={`${x}-${y}`} className="mark__seed" cx={x} cy={y} r={radius} />
        ))}
      </g>
    </svg>
  );
}

/** The horizontal lockup: mark, then "foodhabits" with the seed-coloured dot and a quieter "com". */
export function Wordmark({ href = '#top' }: { href?: string }) {
  return (
    <a className="wordmark" href={href} aria-label="foodhabits.com, home">
      <Mark size={30} />
      <span className="wordmark__name" aria-hidden="true">
        foodhabits<span className="wordmark__dot">.</span>
        <span className="wordmark__tld">com</span>
      </span>
    </a>
  );
}

/** The opening: the mark draws itself on ink, then lifts away to reveal the page. */
export function Preloader({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!root.current) return;
    return playMarkDrawing(root.current, onDone);
  }, [onDone]);
  return (
    <div ref={root} className="preloader" role="presentation">
      <div className="preloader__lockup">
        <Mark size={132} tile={false} weight="master" />
        <span className="preloader__name">
          foodhabits<span className="wordmark__dot">.</span>
          <span className="wordmark__tld">com</span>
        </span>
      </div>
    </div>
  );
}

/** The 3D "Try now" key: a raised face over its own depth, tilting towards the pointer, with a light sweep. */
export function TryNow({ label = 'Try now', size = 'large' }: { label?: string; size?: 'large' | 'small' }) {
  const button = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const node = button.current;
    if (!node) return;
    const onMove = (event: PointerEvent) => {
      const box = node.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width - 0.5;
      const y = (event.clientY - box.top) / box.height - 0.5;
      node.style.setProperty('--rx', `${(-y * 18).toFixed(2)}deg`);
      node.style.setProperty('--ry', `${(x * 22).toFixed(2)}deg`);
      node.style.setProperty('--mx', `${((x + 0.5) * 100).toFixed(1)}%`);
    };
    const onLeave = () => {
      node.style.setProperty('--rx', '0deg');
      node.style.setProperty('--ry', '0deg');
    };
    node.addEventListener('pointermove', onMove);
    node.addEventListener('pointerleave', onLeave);
    return () => {
      node.removeEventListener('pointermove', onMove);
      node.removeEventListener('pointerleave', onLeave);
    };
  }, []);
  return (
    <a ref={button} className={`try try--${size}`} href={APP_URL}>
      <span className="try__glow" aria-hidden="true" />
      <span className="try__depth" aria-hidden="true" />
      <span className="try__face">
        <span className="try__shine" aria-hidden="true" />
        <span className="try__label">{label}</span>
        <span className="try__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </span>
    </a>
  );
}

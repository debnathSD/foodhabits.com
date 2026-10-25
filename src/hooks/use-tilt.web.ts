import { useEffect, type RefObject } from 'react';

/**
 * Tilts an element towards the pointer (web): sets --rx, --ry and the light's
 * --mx, --my on it, for CSS to use. `max` is the largest tilt in degrees.
 */
export function useTilt(ref: RefObject<HTMLElement | null>, max = 6) {
  useEffect(() => {
    const node = ref.current;
    if (!node || !window.matchMedia('(hover: hover)').matches) return;
    const onMove = (event: PointerEvent) => {
      const box = node.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width;
      const y = (event.clientY - box.top) / box.height;
      node.style.setProperty('--rx', `${((0.5 - y) * max).toFixed(2)}deg`);
      node.style.setProperty('--ry', `${((x - 0.5) * max * 1.2).toFixed(2)}deg`);
      node.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
      node.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
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
  }, [ref, max]);
}

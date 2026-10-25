import { Canvas, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

import { LITE } from '../quality';

/**
 * How every 3D canvas renders. Desktop: up to 2× pixel density, shadow maps
 * and the post-processing pass in Effects. Phones: at most 1.5×, drawn straight
 * to the screen with the GPU's own antialiasing and the same neutral tone
 * mapping, a fraction of the work per frame.
 */
const CANVAS_PROPS = {
  dpr: (LITE ? [1, 1.5] : [1, 2]) as [number, number],
  shadows: !LITE,
  gl: { antialias: LITE, alpha: true, toneMapping: LITE ? THREE.NeutralToneMapping : THREE.NoToneMapping },
};

/**
 * Whether a 3D section's canvas should exist, and whether it should draw: it
 * draws only while on (or near) screen. On desktop every canvas is created with
 * the page. On phones one is created about a screen before it scrolls into view
 * and removed again once it is a few screens away, so no more than two scenes
 * hold GPU memory at a time.
 */
function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [mounted, setMounted] = useState(!LITE);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const watch = (margin: string, onChange: (inside: boolean) => void) => {
      const observer = new IntersectionObserver(([entry]) => onChange(entry.isIntersecting), { rootMargin: margin });
      observer.observe(element);
      return observer;
    };
    const observers = [watch('200px 0px', setInView)];
    if (LITE) {
      observers.push(watch('100% 0px', (inside) => inside && setMounted(true)));
      observers.push(watch('250% 0px', (inside) => !inside && setMounted(false)));
    }
    return () => observers.forEach((observer) => observer.disconnect());
  }, []);
  return [ref, inView, mounted] as const;
}

/**
 * Phones draw the 3D at 30 frames a second, whatever the screen's refresh
 * rate: the scenes move gently, and the frames saved keep scrolling smooth.
 */
function ThirtyFps() {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    let frame = 0;
    let last = 0;
    const tick = (now: number) => {
      if (now - last >= 30) {
        last = now;
        invalidate();
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [invalidate]);
  return null;
}

/** A section's 3D canvas, drawing only while in view (and on phones, existing only near it). */
export function Frame({ className, camera, children }: { className: string; camera: [number, number, number]; children: React.ReactNode }) {
  const [ref, inView, mounted] = useInView<HTMLDivElement>();
  const drawing = LITE ? 'demand' : 'always';
  return (
    <div ref={ref} className={className} aria-hidden="true">
      {mounted && (
        <Canvas {...CANVAS_PROPS} frameloop={inView ? drawing : 'never'} camera={{ position: camera, fov: 32 }}>
          {LITE && inView && <ThirtyFps />}
          <Suspense fallback={null}>{children}</Suspense>
        </Canvas>
      )}
    </div>
  );
}

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

/** True while the element is on (or near) screen, so off-screen canvases stop drawing. */
function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: '200px 0px' });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, inView] as const;
}

/** Resolves when the browser next has a moment to spare. */
function whenIdle() {
  return new Promise<void>((resolve) => {
    if ('requestIdleCallback' in window) requestIdleCallback(() => resolve(), { timeout: 1500 });
    else setTimeout(resolve, 200);
  });
}

/** Warm-ups take turns, one scene at a time, so they never pile onto the same frames. */
let warmUps = Promise.resolve();

/**
 * Once the scene has loaded, even off screen, compiles the shaders of every
 * material (parts still hidden included), uploads every texture and draws one
 * frame, so that work is done before anyone scrolls there. Left to the moment a
 * section scrolls into view, it stalls the scroll, for a second or more on a
 * phone. Shaders compile in the background where the browser can
 * (compileAsync), so the page keeps responding meanwhile.
 */
function WarmUp() {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const advance = useThree((state) => state.advance);
  useEffect(() => {
    let cancelled = false;
    warmUps = warmUps
      .then(async () => {
        await whenIdle();
        if (cancelled) return;
        await gl.compileAsync(scene, camera);
        if (cancelled) return;
        scene.traverse((object) => {
          const material = (object as THREE.Mesh).material;
          for (const each of Array.isArray(material) ? material : material ? [material] : []) {
            Object.values(each).forEach((value) => value instanceof THREE.Texture && gl.initTexture(value));
          }
        });
        await new Promise<void>((resolve) =>
          requestAnimationFrame((now) => {
            if (!cancelled) advance(now);
            resolve();
          }),
        );
      })
      .catch((error) => console.warn('Could not warm up a 3D scene', error));
    return () => {
      cancelled = true;
    };
  }, [gl, scene, camera, advance]);
  return null;
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

/**
 * A section's 3D canvas. Every canvas is created with the page and warmed up
 * right after, and draws only while in view.
 */
export function Frame({ className, camera, children }: { className: string; camera: [number, number, number]; children: React.ReactNode }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const drawing = LITE ? 'demand' : 'always';
  return (
    <div ref={ref} className={className} aria-hidden="true">
      <Canvas {...CANVAS_PROPS} frameloop={inView ? drawing : 'never'} camera={{ position: camera, fov: 32 }}>
        {LITE && inView && <ThirtyFps />}
        <Suspense fallback={null}>
          {children}
          <WarmUp />
        </Suspense>
      </Canvas>
    </div>
  );
}

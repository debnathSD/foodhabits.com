import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

/** One radial-gradient layer, in CSS terms: radii and centre as fractions of the frame. */
export type GradientLayer = {
  at: [number, number];
  size: [number, number];
  stops: [number, string][];
};

/**
 * A full-frame background painted inside the 3D scene, matching the section's
 * CSS gradient, so post effects (bloom, depth of field, vignette) cover the
 * whole frame evenly instead of leaving a box around the canvas.
 * Layers are listed top first, like a CSS `background`.
 */
export function Backdrop({ layers }: { layers: GradientLayer[] }) {
  const texture = useMemo(() => {
    const width = 1024;
    const height = 640;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d')!;
    [...layers].reverse().forEach(({ at, size, stops }) => {
      // Draw a circle gradient, scaled into the layer's ellipse.
      context.save();
      context.setTransform(size[0] * width, 0, 0, size[1] * height, at[0] * width, at[1] * height);
      const gradient = context.createRadialGradient(0, 0, 0, 0, 0, 1);
      stops.forEach(([offset, color]) => gradient.addColorStop(offset, color));
      context.fillStyle = gradient;
      context.fillRect(-4, -4, 8, 8);
      context.restore();
    });
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }, [layers]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <primitive attach="background" object={texture} />;
}

/** The chapter backgrounds, kept in step with styles.css. */
export const BACKDROPS = {
  hero: [
    { at: [0.74, 0.5], size: [0.34, 0.46], stops: [[0, 'rgba(43,209,126,0.22)'], [0.7, 'rgba(43,209,126,0)']] },
    { at: [0.7, 0.45], size: [0.9, 0.8], stops: [[0, '#134a30'], [0.48, '#0d2a1c'], [1, '#06100b']] },
  ],
  heroCompact: [
    { at: [0.5, 0.28], size: [0.7, 0.34], stops: [[0, 'rgba(43,209,126,0.24)'], [0.7, 'rgba(43,209,126,0)']] },
    { at: [0.5, 0.3], size: [1.2, 0.7], stops: [[0, '#134a30'], [0.5, '#0d2a1c'], [1, '#06100b']] },
  ],
  inside: [
    { at: [0.7, 0.6], size: [0.4, 0.5], stops: [[0, 'rgba(212,242,92,0.06)'], [0.7, 'rgba(212,242,92,0)']] },
    { at: [0.65, 0.5], size: [0.9, 0.9], stops: [[0, '#0d1712'], [0.7, '#050806'], [1, '#050806']] },
  ],
  gut: [
    { at: [0.66, 0.5], size: [0.5, 0.6], stops: [[0, 'rgba(255,107,91,0.16)'], [0.7, 'rgba(255,107,91,0)']] },
    { at: [0.6, 0.4], size: [1, 0.9], stops: [[0, '#561820'], [0.5, '#3a0e14'], [1, '#1c0609']] },
  ],
  finale: [
    { at: [0.72, 0.55], size: [0.4, 0.55], stops: [[0, 'rgba(43,209,126,0.2)'], [0.7, 'rgba(43,209,126,0)']] },
    { at: [0.65, 0.5], size: [1, 0.9], stops: [[0, '#134a30'], [0.55, '#0d2a1c'], [1, '#06100b']] },
  ],
} satisfies Record<string, GradientLayer[]>;
